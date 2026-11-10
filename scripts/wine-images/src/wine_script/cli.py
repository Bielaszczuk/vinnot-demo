"""Explicit run/export commands; help and export never load service credentials."""

import argparse
import logging
import os
import sys
from pathlib import Path

from .config import Config
from .state import State


class ConfigurationError(ValueError):
    """Only fixed, non-secret validation messages may reach this exception."""


def positive(value):
    number = int(value)
    if number < 1:
        raise argparse.ArgumentTypeError("must be positive")
    return number


def parser():
    root = argparse.ArgumentParser(description="Migrate Argentina wine images; never update PostgreSQL.")
    commands = root.add_subparsers(dest="command", required=True)
    run = commands.add_parser("run", help="Download and upload a pilot (100) or explicit full run")
    export = commands.add_parser("export", help="Export verified SQLite successes without credentials")
    for command in (run, export):
        command.add_argument("--state", type=Path, default=Path("progress.sqlite"))
        command.add_argument("--csv", type=Path, default=Path("mapping.csv"))
    selection = run.add_mutually_exclusive_group()
    selection.add_argument("--limit", type=positive, default=100, help="First N eligible UUIDs, including prior successes")
    selection.add_argument("--all", action="store_true", help="Opt in to all eligible rows")
    run.add_argument("--batch-size", type=positive, default=500)
    run.add_argument("--threads", type=positive, default=3, help="Concurrency, not a rate limit")
    run.add_argument("--attempts", type=positive, default=3, help="Durable attempt budget per URL")
    run.add_argument("--retry-failed", action="store_true", help="Reset unfinished attempt budgets for this run")
    run.add_argument("--quality", type=positive, help="WebP quality 1–100 (default WEBP_QUALITY or 85)")
    run.add_argument("--env-file", type=Path, default=Path(".env"))
    return root


def environment_config(args):
    import dotenv
    dotenv.load_dotenv(dotenv_path=args.env_file, override=False)
    required = ("DATABASE_URL", "R2_ENDPOINT_URL", "R2_BUCKET", "R2_PUBLIC_BASE_URL",
                "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY")
    if any(not os.environ.get(name, "").strip() for name in required):
        raise ConfigurationError("Missing required environment configuration; see .env.example")
    try:
        quality = args.quality if args.quality is not None else int(os.environ.get("WEBP_QUALITY", "85"))
    except ValueError:
        raise ConfigurationError("WEBP_QUALITY must be an integer") from None
    try:
        return Config(os.environ["R2_ENDPOINT_URL"], os.environ["R2_BUCKET"],
                      os.environ["R2_PUBLIC_BASE_URL"], quality)
    except ValueError as error:
        raise ConfigurationError(str(error)) from None


def r2_client(cfg):
    import boto3
    from botocore.config import Config as SDKConfig
    # Explicit credentials, finite socket timeouts, application-controlled retries.
    return boto3.client("s3", endpoint_url=cfg.endpoint, region_name="auto",
                        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
                        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
                        config=SDKConfig(connect_timeout=5, read_timeout=20, max_pool_connections=24,
                                         retries={"total_max_attempts": 1, "mode": "standard"},
                                         proxies={}, s3={"addressing_style": "path"}))


def main(argv=None):
    args = parser().parse_args(argv)
    # No SDK debug logs: request headers/URLs may contain sensitive values.
    for name in ("boto3", "botocore", "urllib3", "requests"):
        logging.getLogger(name).setLevel(logging.CRITICAL)
    try:
        if args.csv.resolve() in {args.state.resolve(), Path(str(args.state.resolve()) + "-wal"),
                                  Path(str(args.state.resolve()) + "-shm")}:
            raise ConfigurationError("CSV and SQLite state paths must differ")
        if args.command == "export":
            with State(args.state) as state:
                state.export(args.csv)
            print("Exported verified successes.")
            return 0
        cfg = environment_config(args)
        from .migrate import migrate
        with State(args.state, cfg.scope()) as state:
            if args.retry_failed:
                state.retry_failed()
            try:
                result = migrate(os.environ["DATABASE_URL"], cfg, state, r2_client(cfg),
                                 limit=None if args.all else args.limit, batch_size=args.batch_size,
                                 threads=args.threads, max_attempts=args.attempts)
            finally:
                state.export(args.csv)
        print(f"Selected {result['selected']}; unfinished {result['failed']}. CSV exported.")
        return int(result["failed"] > 0)
    except KeyboardInterrupt:
        print("Interrupted; resume using the same state and configuration.", file=sys.stderr)
        return 130
    except ConfigurationError as error:
        print(str(error), file=sys.stderr)
        return 1
    except Exception as error:
        print(f"Operation failed ({type(error).__name__}); details suppressed to protect credentials.", file=sys.stderr)
        return 1
