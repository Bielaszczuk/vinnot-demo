"""Explicit plan/stage/apply/rollback commands for private user-media manifests."""
import argparse
import json
import os
import subprocess
from pathlib import Path

import boto3
import psycopg
from botocore.config import Config

from . import user_media


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["plan", "stage", "apply", "rollback"])
    parser.add_argument("--environment", required=True, choices=user_media.ENVIRONMENTS)
    parser.add_argument("--config", required=True, type=Path, help="Private JSON: database_url, AWS profile and R2 credentials")
    parser.add_argument("--directory", required=True, type=Path)
    parser.add_argument("--manifest-sha", help="Required for remote writes")
    args = parser.parse_args()
    os.umask(0o077)
    settings = json.loads(args.config.read_text())
    policy = Config(retries={"total_max_attempts": 1}, connect_timeout=3, read_timeout=15,
                    request_checksum_calculation="when_required", response_checksum_validation="when_required")
    with psycopg.connect(settings["database_url"], autocommit=True, connect_timeout=10) as connection:
        if args.action == "plan":
            # AWS CLI resolves the operator's temporary login session without
            # copying persistent AWS credentials into the migration config.
            credentials = json.loads(subprocess.check_output([
                "aws", "configure", "export-credentials", "--profile", settings["aws_profile"], "--region", "us-east-1", "--format", "process"
            ]))
            source = boto3.client("s3", region_name="us-east-1", config=policy,
                                  aws_access_key_id=credentials["AccessKeyId"], aws_secret_access_key=credentials["SecretAccessKey"],
                                  aws_session_token=credentials.get("SessionToken"))
            manifest = user_media.prepare(connection, source, args.environment, args.directory)
            print(json.dumps({"manifest": manifest["sha256"], "objects": len(manifest["objects"]),
                              "references": len(manifest["references"]), "bytes": sum(o["bytes"] for o in manifest["objects"])}))
            return
        manifest = user_media.load(args.directory)
        if manifest["environment"] != args.environment or manifest["sha256"] != args.manifest_sha:
            raise ValueError("Explicit manifest/destination confirmation required")
        if args.action == "stage":
            account = settings["r2_account"]
            if len(account) != 32 or any(c not in "0123456789abcdef" for c in account):
                raise ValueError("Invalid R2 account")
            target = boto3.client("s3", endpoint_url=f"https://{account}.r2.cloudflarestorage.com", region_name="auto",
                                  aws_access_key_id=settings["r2_access_key"], aws_secret_access_key=settings["r2_secret_key"], config=policy)
            user_media.stage(connection, target, args.directory)
            print(json.dumps({"verified_objects": len(manifest["objects"])}))
        else:
            changed = user_media.apply(connection, args.directory, rollback=args.action == "rollback")
            print(json.dumps({"action": args.action, "changed": changed}))


if __name__ == "__main__":
    main()
