"""Guarded catalogue release: explicit manifest, bounded upload, verification and CAS writes."""

import argparse
import csv
import hashlib
import json
import logging
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from .cli import positive, r2_client
from .config import Config
from .migrate import migrate
from .release import (Budget, PacedStore, SourceDownloads, PUBLIC_BASE, apply_mapping, digest, load_manifest,
                      prepare_manifest, private_json, selection, upload_one, verify_object, validate_write_scope)
from .state import State


def read_mapping(path):
    with path.open() as file:
        rows = list(csv.DictReader(file))
    for row in rows:
        for field in ("new_url", "object_key"):
            row[field] = row[field] or None
    return rows


def parser():
    root = argparse.ArgumentParser(description="Argentina wine images release; production requires exact manifest approval")
    commands = root.add_subparsers(dest="command", required=True)
    prepare = commands.add_parser("prepare", help="Validate dev/prod snapshots and create private manifest")
    prepare.add_argument("--dev-snapshot", type=Path, required=True)
    prepare.add_argument("--prod-snapshot", type=Path, required=True)
    prepare.add_argument("--manifest", type=Path, required=True)
    for name in ("upload", "verify", "apply", "rollback"):
        command = commands.add_parser(name)
        command.add_argument("--manifest", type=Path, required=True)
        command.add_argument("--env-file", type=Path, required=True, help="Private JSON credentials; never commit")
        command.add_argument("--csv", type=Path, required=True)
        command.add_argument("--ids", type=Path, help="JSON array of exact pilot UUIDs")
        if name in ("upload", "verify"):
            command.add_argument("--budget", type=Path, required=True, help="Shared durable ledger for all runs")
            command.add_argument("--state", type=Path, required=True)
        if name == "upload":
            command.add_argument("--threads", type=positive, default=3)
            command.add_argument("--attempts", type=positive, default=2)
        if name in ("apply", "rollback"):
            command.add_argument("--environment", choices=("dev", "prod"), default="dev")
            command.add_argument("--journal", type=Path, required=True)
            command.add_argument("--write", action="store_true", help="Explicitly opt in to database writes")
            command.add_argument("--production-manifest", help="Approved manifest SHA-256; required for production writes/rollback")
    return root


def validate_paths(args):
    """Outputs must never replace credentials, manifests, journals or SQLite files."""
    paths = [value.resolve() for value in vars(args).values() if isinstance(value, Path)]
    if hasattr(args, "csv"):
        paths.append(args.csv.with_suffix(".verified.json").resolve())
    if hasattr(args, "state"):
        paths.extend(Path(str(args.state.resolve()) + suffix) for suffix in ("-wal", "-shm"))
    for index, path in enumerate(paths):
        for other in paths[:index]:
            if path == other or (path.exists() and other.exists() and path.samefile(other)):
                raise ValueError("Release input and output paths must differ")
    if hasattr(args, "env_file") and args.env_file.stat().st_mode & 0o077:
        raise ValueError("Credential file must be private (chmod 600)")


def main(argv=None):
    args = parser().parse_args(argv)
    os.umask(0o077)
    validate_paths(args)
    for name in ("boto3", "botocore", "urllib3", "requests"):
        logging.getLogger(name).setLevel(logging.CRITICAL)
    if args.command == "prepare":
        manifest = prepare_manifest(json.loads(args.dev_snapshot.read_text()), json.loads(args.prod_snapshot.read_text()))
        private_json(args.manifest, manifest)
        print(json.dumps({"candidates": len(manifest["items"]), "manifest_sha256": manifest["sha256"]}), flush=True)
        return 0
    manifest = load_manifest(args.manifest)
    if args.command in ("apply", "rollback"):
        validate_write_scope(args.environment, args.write, args.production_manifest, manifest["sha256"])
    ids = json.loads(args.ids.read_text()) if args.ids else None
    chosen = selection(manifest, ids)
    settings = json.loads(args.env_file.read_text())
    # Environment never comes from a browser/CSV/remote response.
    if args.command in ("upload", "verify"):
        os.environ.update({k: settings[k] for k in ("R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY")})
        cfg = Config(settings["R2_ENDPOINT_URL"], settings["R2_BUCKET"], settings["R2_PUBLIC_BASE_URL"], 85)
        if cfg.public_base != PUBLIC_BASE or cfg.bucket != "vinnot-catalog-images":
            raise ValueError("Unapproved release destination")
        budget = Budget(args.budget)
        store = PacedStore(r2_client(cfg), budget)
        scope = digest([manifest["sha256"], cfg.scope(), "1024px/4Mpx/128KiB/immutable-v3/strip-metadata-srgb"])
        try:
            if args.command == "upload":
                if args.threads > 24 or args.attempts > 2:
                    raise ValueError("Release allows at most 24 workers and 2 attempts")
                available = [(r["dev"]["id"], r["dev"]["image_url"]) for r in chosen]
                def fetch(_dsn, after, size):
                    return [r for r in available if after is None or r[0] > after][:size]
                # Keyset iteration needs UUID order, independent of chosen pilot ordering.
                available.sort()
                with State(args.state, scope) as state, SourceDownloads() as downloads:
                    try:
                        result = migrate(None, cfg, state, store, limit=None, batch_size=250,
                                         threads=args.threads, max_attempts=args.attempts, fetch=fetch,
                                         process=lambda *a: upload_one(*a, downloader=downloads),
                                         progress=lambda r: print(json.dumps(r), flush=True))
                    finally:
                        state.export(args.csv)
                print(json.dumps({**result, "budget": budget.usage()}), flush=True)
                return int(result["failed"] > 0)
            rows = read_mapping(args.csv)
            allowed = {r["dev"]["id"] for r in chosen}
            from .release import validate_mapping
            validate_mapping(rows, manifest)
            rows = [r for r in rows if r["id"] in allowed]
            verified = []
            with SourceDownloads(per_second=24) as downloads, ThreadPoolExecutor(max_workers=24) as executor:
                # Bound queued work as well as running workers.
                for start in range(0, len(rows), 250):
                    futures = [executor.submit(verify_object, row, cfg, store, public_get=downloads)
                               for row in rows[start:start + 250]]
                    verified.extend(future.result() for future in as_completed(futures))
                    print(json.dumps({"verified": len(verified)}), flush=True)
            private_json(args.csv.with_suffix(".verified.json"), {
                "manifest": manifest["sha256"], "mapping": hashlib.sha256(args.csv.read_bytes()).hexdigest(),
                "rows": verified})
            print(json.dumps({"verified": len(verified), "budget": budget.usage()}), flush=True)
            return 0
        finally:
            budget.close()
    rows = read_mapping(args.csv)
    verified = json.loads(args.csv.with_suffix(".verified.json").read_text())
    if (verified["manifest"] != manifest["sha256"] or verified["mapping"] != hashlib.sha256(args.csv.read_bytes()).hexdigest()
            or {r["id"] for r in verified["rows"]} != {r["id"] for r in rows}):
        raise ValueError("Mapping lacks complete public/S3 verification")
    if ids:
        rows = [r for r in rows if r["id"] in set(ids)]
    import psycopg
    from psycopg.rows import dict_row
    with psycopg.connect(settings["DATABASE_URL_" + args.environment.upper()], autocommit=True,
                        connect_timeout=15, row_factory=dict_row) as connection:
        result = apply_mapping(connection, manifest, rows, args.journal, environment=args.environment,
                               write=args.write, rollback=args.command == "rollback",
                               production_manifest=args.production_manifest)
    print(json.dumps(result), flush=True)
    return int(result["conflict"] > 0)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("Interrupted; progress persisted. Resume with identical manifest/state/budget.", flush=True)
        raise SystemExit(130)
    except Exception as error:
        print(f"Release failed ({type(error).__name__}); details suppressed to protect credentials.", flush=True)
        raise SystemExit(1)
