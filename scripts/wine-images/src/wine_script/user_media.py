"""Small, reversible migrations of managed legacy uploads; never catalogue URLs.

Operational adapter only. Originals, transformed bytes and the checksummed manifest
stay in a private directory. Storage deletion is intentionally not implemented.
"""
import hashlib
import io
import json
import re
import uuid
from pathlib import Path

from PIL import Image, ImageCms, ImageOps
from psycopg import sql

from .release import digest, private_json

ENVIRONMENTS = {
    "development": ("vinnot", "vinnot-dev-uploads-497675597655", "vinnot-user-uploads-dev"),
    "production": ("vinnot_prod", "vinnot-prod-uploads-497675597655", "vinnot-user-uploads-prod"),
}
FIELDS = {"users": "profile_image_url", "wines": "image_url", "wine_submissions": "image_url"}
UUID = r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
AVATAR = re.compile(rf"^/api/uploads/avatars/avatar_({UUID})_([0-9]+|{UUID})\.(png|jpe?g|webp)$")
LABEL = re.compile(rf"^/api/uploads/wine-labels/wine_label_({UUID})\.(png|jpe?g|webp)$")
MAX_ITEMS = 100
MAX_INPUT_BYTES = 8 * 1024 * 1024
MAX_PIXELS = 24_000_000


def sha(data):
    return hashlib.sha256(data).hexdigest()


def optimize(data, avatar=False):
    if not data or len(data) > MAX_INPUT_BYTES:
        raise ValueError("Input byte limit")
    with Image.open(io.BytesIO(data)) as source:
        if source.format not in {"JPEG", "PNG", "WEBP", "GIF"} or source.width * source.height > MAX_PIXELS:
            raise ValueError("Unsupported image or pixel limit")
        source.seek(0)
        image = ImageOps.exif_transpose(source)
        mode = "RGBA" if "A" in image.getbands() or "transparency" in source.info else "RGB"
        if source.info.get("icc_profile"):
            image = ImageCms.profileToProfile(image, ImageCms.ImageCmsProfile(io.BytesIO(source.info["icc_profile"])),
                                             ImageCms.createProfile("sRGB"), outputMode=mode)
        else:
            image = image.convert(mode)
        side = 512 if avatar else 1600
        image.thumbnail((side, side), Image.Resampling.LANCZOS)
        clean = Image.new(mode, image.size)
        clean.paste(image)
        out = io.BytesIO()
        clean.save(out, format="WEBP", quality=85, method=3, exif=b"", icc_profile=b"", xmp=b"")
        result = out.getvalue()
        if len(result) > (128 if avatar else 512) * 1024:
            raise ValueError("Output byte limit")
        return result


def references(connection):
    result = []
    for table, field in FIELDS.items():
        rows = connection.execute(sql.SQL("SELECT id::text, {field} FROM {table} WHERE {field} LIKE '/api/uploads/%'")
                                  .format(field=sql.Identifier(field), table=sql.Identifier(table))).fetchall()
        result.extend({"table": table, "id": row[0], "old_url": row[1]} for row in rows)
    return sorted(result, key=lambda r: (r["table"], r["id"]))


def assert_scope(connection, environment):
    if connection.execute("SELECT current_database()").fetchone()[0] != ENVIRONMENTS[environment][0]:
        raise ValueError("Wrong destination database")
    # Migration requires a quiet legacy lifecycle snapshot, not a disabled worker.
    if connection.execute("SELECT count(*) FROM external_effects WHERE kind LIKE '%avatar%' OR kind LIKE '%label%' OR kind LIKE '%cover%'").fetchone()[0]:
        raise ValueError("Pending media effects; reconcile before migration")
    if connection.execute("SELECT count(*) FROM managed_cover_images WHERE storage_provider <> 'r2'").fetchone()[0]:
        raise ValueError("Legacy managed covers require a separate manifest")
    if connection.execute("SELECT count(*) FROM wine_submissions WHERE image_quarantined").fetchone()[0]:
        raise ValueError("Quarantined labels require a separate private migration")
    for table, field in (("events", "image_url"), ("wine_routes", "image_url"), ("wines", "bottle_image_url"),
                         ("wineries", "image_url"), ("wineries", "background_image_url")):
        count = connection.execute(sql.SQL("SELECT count(*) FROM {table} WHERE {field} LIKE '/api/uploads/%' AND {field} NOT LIKE '/api/uploads/covers/%'")
                                   .format(table=sql.Identifier(table), field=sql.Identifier(field))).fetchone()[0]
        if count:
            raise ValueError("Unsupported managed reference requires explicit mapping")


def source_key(row):
    avatar, label = AVATAR.fullmatch(row["old_url"]), LABEL.fullmatch(row["old_url"])
    if avatar and row["table"] == "users" and avatar[1] == row["id"]:
        return row["old_url"].removeprefix("/api/uploads/"), True, avatar[1]
    if label and row["table"] in {"wines", "wine_submissions"}:
        if row["table"] == "wine_submissions" and row["id"] != label[1]:
            raise ValueError("Submission identity mismatch")
        return row["old_url"].removeprefix("/api/uploads/"), False, label[1]
    raise ValueError("Unmanaged, foreign-owned or unsupported source")


def prepare(connection, source, environment, directory):
    directory = Path(directory)
    directory.mkdir(mode=0o700, parents=True, exist_ok=True)
    if (directory / "manifest.json").exists():
        raise ValueError("Manifest already exists; resume instead of replacing its backup")
    with connection.transaction():
        connection.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY")
        assert_scope(connection, environment)
        rows = references(connection)
    if not rows or len(rows) > MAX_ITEMS:
        raise ValueError("Empty or oversized migration")
    objects = {}
    for row in rows:
        key, avatar, owner = source_key(row)
        if key in objects:
            continue
        response = source.get_object(Bucket=ENVIRONMENTS[environment][1], Key=key)
        with response["Body"] as body:
            original = body.read(MAX_INPUT_BYTES + 1)
        encoded = optimize(original, avatar)
        token = sha(key.encode())
        original_file, webp_file = token + ".original", token + ".webp"
        for name, value in ((original_file, original), (webp_file, encoded)):
            (directory / name).write_bytes(value)
            (directory / name).chmod(0o600)
        filename = ("avatar_" + owner + "_" + str(uuid.uuid5(uuid.NAMESPACE_URL, key + sha(original)))
                    if avatar else "wine_label_" + owner) + ".r2.webp"
        target = f"uploads/{environment}/{'avatars' if avatar else 'wine-labels'}/{filename}"
        objects[key] = {"source_key": key, "source_sha256": sha(original), "file": webp_file,
                        "backup": original_file, "sha256": sha(encoded), "bytes": len(encoded),
                        "target_key": target, "new_url": "https://images.vinnot.com/" + target}
    manifest = {"version": 1, "environment": environment, "references": rows, "objects": list(objects.values())}
    manifest["sha256"] = digest(manifest)
    private_json(directory / "manifest.json", manifest)
    return manifest


def load(directory):
    directory = Path(directory)
    manifest = json.loads((directory / "manifest.json").read_text())
    checksum = manifest.pop("sha256")
    if digest(manifest) != checksum or manifest["version"] != 1 or manifest["environment"] not in ENVIRONMENTS:
        raise ValueError("Manifest checksum or environment mismatch")
    if not 0 < len(manifest["references"]) <= MAX_ITEMS:
        raise ValueError("Invalid manifest count")
    expected_keys = set()
    for row in manifest["references"]:
        uuid.UUID(row["id"])
        expected_keys.add(source_key(row)[0])
    if expected_keys != {item["source_key"] for item in manifest["objects"]}:
        raise ValueError("Object/reference mismatch")
    for item in manifest["objects"]:
        for field in ("file", "backup"):
            if Path(item[field]).name != item[field]:
                raise ValueError("Unsafe artifact path")
        original = (directory / item["backup"]).read_bytes()
        encoded = (directory / item["file"]).read_bytes()
        if sha(original) != item["source_sha256"] or sha(encoded) != item["sha256"] or len(encoded) != item["bytes"]:
            raise ValueError("Artifact integrity mismatch")
        row = next(r for r in manifest["references"] if source_key(r)[0] == item["source_key"])
        key, avatar, owner = source_key(row)
        filename = ("avatar_" + owner + "_" + str(uuid.uuid5(uuid.NAMESPACE_URL, key + sha(original)))
                    if avatar else "wine_label_" + owner) + ".r2.webp"
        target = f"uploads/{manifest['environment']}/{'avatars' if avatar else 'wine-labels'}/{filename}"
        if item["target_key"] != target or item["new_url"] != "https://images.vinnot.com/" + target:
            raise ValueError("Destination mismatch")
    manifest["sha256"] = checksum
    return manifest


def reserve(connection, byte_count=0):
    # Same durable per-environment budgets as backend. No refunds after ambiguity.
    with connection.transaction():
        if byte_count:
            requests = [("r2-storage", "lifetime", 0, byte_count, 536870912),
                        ("r2-write", None, 1, 0, 5000)]
        else:
            requests = [("r2-read", None, 1, 0, 100000)]
        for scope, period, operations, size, limit in requests:
            period = period or connection.execute("SELECT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM')").fetchone()[0]
            connection.execute("INSERT INTO storage_operation_budgets(scope,period) VALUES (%s,%s) ON CONFLICT DO NOTHING", (scope, period))
            column = "bytes_reserved" if size else "operations"
            changed = connection.execute(sql.SQL("UPDATE storage_operation_budgets SET operations=operations+%s, bytes_reserved=bytes_reserved+%s WHERE scope=%s AND period=%s AND {column} <= %s")
                                         .format(column=sql.Identifier(column)), (operations, size, scope, period, limit - (size or operations)))
            if changed.rowcount != 1:
                raise ValueError("Existing environment budget exhausted")


def stage(connection, target, directory):
    manifest = load(directory)
    bucket = ENVIRONMENTS[manifest["environment"]][2]
    with connection.transaction():
        assert_scope(connection, manifest["environment"])
    for item in manifest["objects"]:
        data = (Path(directory) / item["file"]).read_bytes()
        reserve(connection, len(data))
        try:
            target.put_object(Bucket=bucket, Key=item["target_key"], Body=data,
                              ContentType="image/webp", IfNoneMatch="*")
        except target.exceptions.ClientError as error:
            if error.response["ResponseMetadata"]["HTTPStatusCode"] != 412:
                raise
        reserve(connection)
        response = target.get_object(Bucket=bucket, Key=item["target_key"])
        with response["Body"] as body:
            actual = body.read(512 * 1024 + 1)
        if actual != data or response["ContentType"] != "image/webp":
            raise ValueError("Remote object verification failed")
    private_json(Path(directory) / "verified.json", {"manifest": manifest["sha256"], "objects": len(manifest["objects"])})
    return manifest


def apply(connection, directory, rollback=False):
    manifest = load(directory)
    proof = json.loads((Path(directory) / "verified.json").read_text())
    if proof["manifest"] != manifest["sha256"]:
        raise ValueError("Missing verification for this manifest")
    objects = {item["source_key"]: item for item in manifest["objects"]}
    changed = 0
    with connection.transaction():
        connection.execute("SET LOCAL lock_timeout='2s'")
        connection.execute("SET LOCAL statement_timeout='20s'")
        assert_scope(connection, manifest["environment"])
        for row in manifest["references"]:
            item = objects[source_key(row)[0]]
            previous, desired = (item["new_url"], row["old_url"]) if rollback else (row["old_url"], item["new_url"])
            table, field = row["table"], FIELDS[row["table"]]
            current = connection.execute(sql.SQL("SELECT {field} FROM {table} WHERE id=%s FOR UPDATE")
                                         .format(table=sql.Identifier(table), field=sql.Identifier(field)), (row["id"],)).fetchone()
            if current is None or current[0] not in (previous, desired):
                raise ValueError("Concurrent replacement/deletion: whole batch rolled back")
            if current[0] == desired:
                continue
            suffix = sql.SQL(", revision=revision+1") if table == "wines" else sql.SQL("")
            connection.execute(sql.SQL("UPDATE {table} SET {field}=%s, updated_at=now(){suffix} WHERE id=%s AND {field}=%s")
                               .format(table=sql.Identifier(table), field=sql.Identifier(field), suffix=suffix), (desired, row["id"], previous))
            if table == "users" and not rollback:
                connection.execute("INSERT INTO r2_avatar_inventory(image_url,owner_id) VALUES (%s,%s) ON CONFLICT DO NOTHING", (desired, row["id"]))
            changed += 1
    private_json(Path(directory) / ("rollback.json" if rollback else "applied.json"),
                 {"manifest": manifest["sha256"], "changed": changed, "originals_retained": True})
    return changed
