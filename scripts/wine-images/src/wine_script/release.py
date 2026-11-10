"""Manifest-bound release operations. DB writes are deliberately separate from uploads.

This operational adapter is never imported by Vinnot domain/application/UI code.
Manifests, source URLs, database credentials and journals must stay private.
"""

import hashlib
import io
import json
import os
import re
import sqlite3
import threading
import time
import uuid
import requests
from pathlib import Path
from urllib.parse import quote, urlsplit, urlunsplit

from PIL import Image

from .config import validate_url
from .images import convert_image, download_image
from .migrate import head, matches
from .placeholders import PLACEHOLDER_SHA256, is_placeholder_source, is_placeholder_object

ORIGINS = frozenset({"images.vivino.com"})
PUBLIC_BASE = "https://images.vinnot.com"
MAX_ITEMS = 40_000
MAX_OBJECT_BYTES = 128 * 1024
MAX_STORAGE_BYTES = 8_000_000_000
MAX_WRITES = 100_000
MAX_READS = 400_000
IDENTITY = ("id", "name", "vintage", "winery_id", "wine_type", "country")
KEY = re.compile(r"^wines/ar/([0-9a-f-]{36})/([0-9a-f]{64})\.webp$")


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False,
                                     separators=(",", ":")).encode()).hexdigest()


def identity(row):
    return {key: row[key] for key in IDENTITY}


def source_url(value):
    # Two catalogue paths contain literal spaces. Encode the path only; retain
    # the original value in the manifest and never rewrite host/query/userinfo.
    parsed = urlsplit(value)
    normalized = urlunsplit(parsed._replace(path=quote(parsed.path, safe="/%:@!$&'()*+,;=-._~")))
    validate_url(normalized, https=True)
    return normalized


def private_json(path, value):
    path = Path(path)
    temporary = path.with_name(path.name + ".tmp")
    with temporary.open("w", encoding="utf-8") as file:
        os.chmod(temporary, 0o600)
        json.dump(value, file, ensure_ascii=False)
        file.flush()
        os.fsync(file.fileno())
    os.replace(temporary, path)


def prepare_manifest(dev, prod):
    """Require one-to-one IDs and full identity; protect non-null prod images."""
    if len(dev) > MAX_ITEMS or len({r["id"] for r in dev}) != len(dev):
        raise ValueError("Invalid candidate count or duplicate IDs")
    if len({r["id"] for r in prod}) != len(prod):
        raise ValueError("Duplicate production IDs")
    production = {r["id"]: r for r in prod}
    result = []
    for row in dev:
        uuid.UUID(row["id"])
        other = production.get(row["id"])
        if not other or identity(row) != identity(other):
            raise ValueError("Catalogue identity mismatch")
        if row["country"] != "ar" or row["created_by"] is not None or not row["is_active"]:
            raise ValueError("Candidate is outside the approved Argentina catalogue")
        source = validate_url(source_url(row["image_url"]), https=True)
        if source.hostname not in ORIGINS or source.port not in (None, 443):
            raise ValueError("Unapproved source origin")
        result.append({"dev": row, "prod": other})
    value = {"version": 1, "source_database": "vinnot", "destination_database": "vinnot_prod",
             "country": "ar", "public_base": PUBLIC_BASE, "items": result}
    value["sha256"] = digest(value)
    return value


def load_manifest(path):
    value = json.loads(Path(path).read_text())
    expected = value.pop("sha256")
    if digest(value) != expected or value["public_base"] != PUBLIC_BASE:
        raise ValueError("Manifest digest/destination mismatch")
    value["sha256"] = expected
    # Re-run identity/count/origin validation, including on manually edited manifests.
    rebuilt = prepare_manifest([r["dev"] for r in value["items"]], [r["prod"] for r in value["items"]])
    if rebuilt["sha256"] != expected:
        raise ValueError("Unsupported manifest shape")
    return value


class BudgetExceeded(RuntimeError):
    pass


class Budget:
    """Durable worst-case reservations BEFORE external calls, shared by every run.

    Counts never reset automatically. Repeated failed PUTs reserve bytes again;
    this is conservative and also bounds version/crash windows. A new ledger
    requires an operator reconciliation of ALL R2 account usage, not just one run.
    """

    def __init__(self, path, *, writes=MAX_WRITES, reads=MAX_READS, storage=MAX_STORAGE_BYTES):
        self.connection = sqlite3.connect(path, check_same_thread=False)
        self.lock = threading.Lock()
        self.limits = (writes, reads, storage)
        self.connection.execute("PRAGMA synchronous=FULL")
        self.connection.execute("CREATE TABLE IF NOT EXISTS budget (id INTEGER PRIMARY KEY CHECK(id=1), writes INTEGER, reads INTEGER, bytes INTEGER)")
        self.connection.execute("INSERT OR IGNORE INTO budget VALUES(1,0,0,0)")
        self.connection.commit()

    def reserve(self, kind, size=0):
        with self.lock, self.connection:
            # BEGIN IMMEDIATE serializes processes as well as worker threads.
            self.connection.execute("BEGIN IMMEDIATE")
            old = self.connection.execute("SELECT writes,reads,bytes FROM budget WHERE id=1").fetchone()
            new = (old[0] + (kind == "write"), old[1] + (kind == "read"), old[2] + size)
            if any(n > limit for n, limit in zip(new, self.limits)):
                raise BudgetExceeded("Migration budget exhausted; no remote call dispatched")
            self.connection.execute("UPDATE budget SET writes=?, reads=?, bytes=? WHERE id=1", new)

    def usage(self):
        with self.lock:
            return dict(zip(("writes", "reads", "reserved_bytes"), self.connection.execute(
                "SELECT writes,reads,bytes FROM budget WHERE id=1").fetchone()))

    def close(self):
        self.connection.close()


class PacedStore:
    """No automatic SDK retries; cap aggregate S3 calls across worker threads."""

    def __init__(self, store, budget, *, per_second=40):
        if not 0 < per_second <= 50:
            raise ValueError("S3 rate must be between 0 and 50 per second")
        self.store, self.budget = store, budget
        self.interval, self.lock, self.next_call = 1 / per_second, threading.Lock(), 0

    def _call(self, name, **kwargs):
        is_write = name == "put_object"
        self.budget.reserve("write" if is_write else "read", len(kwargs["Body"]) if is_write else 0)
        with self.lock:
            now = time.monotonic()
            time.sleep(max(0, self.next_call - now))
            self.next_call = time.monotonic() + self.interval
        return getattr(self.store, name)(**kwargs)

    def head_object(self, **kwargs):
        return self._call("head_object", **kwargs)

    def put_object(self, **kwargs):
        return self._call("put_object", **kwargs)

    def get_object(self, **kwargs):
        return self._call("get_object", **kwargs)


class SourceDownloads:
    """One HTTP session per worker, bounded aggregate source request rate."""

    def __init__(self, *, per_second=12):
        if not 0 < per_second <= 40:
            raise ValueError("Download rate must be between 0 and 40 per second")
        self.local = threading.local()
        self.lock = threading.Lock()
        self.sessions = []
        self.next_call = 0
        self.interval = 1 / per_second

    def __enter__(self):
        return self

    def __exit__(self, *_):
        for session in self.sessions:
            session.close()

    def __call__(self, url, *, max_bytes=20 * 1024 * 1024, allowed_hosts=ORIGINS):
        if not hasattr(self.local, "session"):
            session = requests.Session()
            session.trust_env = False
            self.local.session = session
            with self.lock:
                self.sessions.append(session)
        with self.lock:
            time.sleep(max(0, self.next_call - time.monotonic()))
            self.next_call = time.monotonic() + self.interval
        return download_image(source_url(url), self.local.session,
                              allowed_hosts=allowed_hosts, max_bytes=max_bytes)


def upload_one(id, url, cfg, store, *, downloader=None):
    if is_placeholder_source(url):
        return {"object_key": None, "new_url": None}
    downloader = downloader or (lambda value: download_image(source_url(value), allowed_hosts=ORIGINS))
    body = convert_image(downloader(url), cfg.quality, max_pixels=4_000_000, max_side=1024,
                         strip_metadata=True)
    if len(body) > MAX_OBJECT_BYTES:
        raise ValueError("Optimized image exceeds 128 KiB; exclude for manual review")
    sha = hashlib.sha256(body).hexdigest()
    if sha == PLACEHOLDER_SHA256:
        raise ValueError("Known placeholder bytes require a missing-image mapping")
    key = f"wines/ar/{uuid.UUID(id)}/{sha}.webp"
    metadata = {"sha256": sha, "source-sha256": hashlib.sha256(url.encode()).hexdigest(),
                "config-sha256": cfg.scope()}
    if not matches(head(store, cfg, key), body, metadata):
        store.put_object(Bucket=cfg.bucket, Key=key, Body=body, ContentType="image/webp",
                         CacheControl="public, max-age=31536000, immutable", Metadata=metadata,
                         IfNoneMatch="*")
    if not matches(head(store, cfg, key), body, metadata):
        raise ValueError("Object verification failed")
    return {"object_key": key, "new_url": cfg.public_base + "/" + key}


def verify_object(row, cfg, store, *, public_get=download_image):
    if row["object_key"] is None and row["new_url"] is None and is_placeholder_source(row["original_url"]):
        return {"id": row["id"], "excluded": "catalogue-placeholder"}
    match = KEY.fullmatch(row["object_key"])
    if not match or match[1] != row["id"] or row["new_url"] != PUBLIC_BASE + "/" + row["object_key"]:
        raise ValueError("Mapping URL/key/UUID mismatch")
    response = store.get_object(Bucket=cfg.bucket, Key=row["object_key"])
    with response["Body"] as stream:
        body = stream.read(MAX_OBJECT_BYTES + 1)
    if len(body) > MAX_OBJECT_BYTES or response["ContentType"] != "image/webp":
        raise ValueError("Invalid remote image")
    public_body = public_get(row["new_url"], max_bytes=MAX_OBJECT_BYTES, allowed_hosts={"images.vinnot.com"})
    if hashlib.sha256(body).hexdigest() != match[2] or public_body != body:
        raise ValueError("Public/S3 image digest mismatch")
    with Image.open(io.BytesIO(body)) as image:
        if image.format != "WEBP" or max(image.size) > 1024:
            raise ValueError("Invalid remote format/dimensions")
        if image.getexif() or set(image.info) & {"exif", "xmp", "icc_profile", "comment"}:
            raise ValueError("Remote image contains metadata")
        return {"id": row["id"], "bytes": len(body), "width": image.width, "height": image.height}


def selection(manifest, ids=None):
    available = {r["dev"]["id"]: r for r in manifest["items"]}
    if ids is None:
        return list(available.values())
    if len(ids) != len(set(ids)) or not set(ids) <= available.keys():
        raise ValueError("Pilot IDs are duplicated or outside manifest")
    return [available[id] for id in ids]


def validate_mapping(rows, manifest):
    candidates = {r["dev"]["id"]: r for r in manifest["items"]}
    if len({r["id"] for r in rows}) != len(rows):
        raise ValueError("Duplicate mapping IDs")
    for row in rows:
        candidate = candidates.get(row["id"])
        if not candidate or row["original_url"] != candidate["dev"]["image_url"]:
            raise ValueError("Mapping does not match approved manifest")
        if is_placeholder_source(row["original_url"]):
            if row["new_url"] is not None or row["object_key"] is not None:
                raise ValueError("Catalogue placeholder must remain NULL; regenerate and verify the CSV")
            continue
        if row["object_key"] is None or row["new_url"] is None or is_placeholder_object(row["object_key"]):
            raise ValueError("Invalid missing-image or placeholder mapping")
        match = KEY.fullmatch(row["object_key"])
        if (not candidate or row["original_url"] != candidate["dev"]["image_url"] or not match
                or match[1] != row["id"] or row["new_url"] != PUBLIC_BASE + "/" + row["object_key"]
                or len(row["new_url"]) > 500):
            raise ValueError("Mapping does not match approved manifest")
    return candidates


def eligible(current, previous, new_url, *, environment):
    if identity(current) != identity(previous) or not current["is_active"] or current["created_by"] is not None:
        return "conflict"
    if current["image_url"] == new_url:
        return "unchanged"
    if environment == "prod" and current["image_url"] is not None:
        return "protected"
    if current["revision"] != previous["revision"] or current["image_url"] != previous["image_url"]:
        return "conflict"
    return "apply"


def validate_write_scope(environment, write, production_manifest, manifest_sha):
    """Production is opt-in for one exact, separately reviewed manifest."""
    if not isinstance(manifest_sha, str) or not re.fullmatch(r'[0-9a-f]{64}', manifest_sha):
        raise ValueError("Invalid manifest digest")
    if environment not in ("dev", "prod"):
        raise ValueError("Unknown database environment")
    if production_manifest is not None and (environment != "prod" or not write
                                           or production_manifest != manifest_sha):
        raise ValueError("Production approval does not match the exact write scope")
    if environment == "prod" and write and production_manifest != manifest_sha:
        raise ValueError("Production writes require explicit approval of this manifest")


def apply_mapping(connection, manifest, rows, journal_path, *, environment="dev", write=False, rollback=False,
                  production_manifest=None):
    """Batch CAS updates. Journal fsync precedes commit; retry reconciles commit windows.

    Rollback also requires the exact post-apply revision: subsequent edits are preserved.
    Production additionally requires the explicit approved manifest digest.
    """
    if digest({key: value for key, value in manifest.items() if key != 'sha256'}) != manifest.get('sha256'):
        raise ValueError("Manifest digest mismatch")
    validate_write_scope(environment, write, production_manifest, manifest["sha256"])
    candidates = validate_mapping(rows, manifest)
    target = "vinnot" if environment == "dev" else "vinnot_prod"
    with connection.transaction():
        connection.execute("SET TRANSACTION READ ONLY")
        actual = connection.execute("SELECT current_database() AS db").fetchone()["db"]
        if actual != target:
            raise ValueError("Database target mismatch")
    journal = json.loads(Path(journal_path).read_text()) if Path(journal_path).exists() else {
        "manifest": manifest["sha256"], "environment": environment, "rows": {}}
    if journal["manifest"] != manifest["sha256"] or journal["environment"] != environment:
        raise ValueError("Journal belongs to a different release/destination")
    result = {"applied": 0, "unchanged": 0, "protected": 0, "conflict": 0, "would_apply": 0}
    for offset in range(0, len(rows), 250):
        batch = rows[offset:offset + 250]
        with connection.transaction():
            connection.execute("SET LOCAL statement_timeout='30s'")
            connection.execute("SET LOCAL lock_timeout='2s'")
            if not write:
                connection.execute("SET TRANSACTION READ ONLY")
            current = {r["id"]: r for r in connection.execute("""SELECT w.id::text, w.name,w.vintage,
                w.winery_id::text,w.wine_type,c.code AS country,w.image_url,w.bottle_image_url,
                w.revision,w.updated_at::text,w.is_active,w.created_by::text FROM wines w
                JOIN countries c ON c.id=w.country_id WHERE w.id=ANY(%s::uuid[])""",
                ([r["id"] for r in batch],)).fetchall()}
            updates = []
            for row in batch:
                id = row["id"]
                old = candidates[id][environment]
                now = current.get(id)
                saved = journal["rows"].get(id)
                if rollback:
                    if (not saved or not now or saved["new_url"] != row["new_url"]
                            or identity(now) != identity(saved["old"])
                            or now["image_url"] != saved["new_url"]
                            or now["revision"] != saved["old"]["revision"] + 1):
                        result["conflict"] += 1
                        continue
                    new_url = saved["old"]["image_url"]
                    action = "apply"
                else:
                    new_url = row["new_url"]
                    action = eligible(now, old, new_url, environment=environment) if now else "conflict"
                if action != "apply":
                    result[action] += 1
                    continue
                if not write:
                    result["would_apply"] += 1
                    continue
                if not rollback:
                    journal["rows"][id] = {"old": now, "new_url": new_url}
                updates.append({"id": id, "revision": now["revision"], "old_url": now["image_url"],
                                "new_url": new_url})
            if updates:
                private_json(journal_path, journal)
                changed = connection.execute("""UPDATE wines w SET image_url=x.new_url,
                    revision=w.revision+1, updated_at=CURRENT_TIMESTAMP
                    FROM jsonb_to_recordset(%s::jsonb) AS x(id uuid,revision bigint,old_url text,new_url text)
                    WHERE w.id=x.id AND w.revision=x.revision AND w.image_url IS NOT DISTINCT FROM x.old_url
                    RETURNING w.id::text""", (json.dumps(updates),)).fetchall()
                if len(changed) != len(updates):
                    raise ValueError("Concurrent update detected; batch rolled back")
                result["applied"] += len(changed)
    return result
