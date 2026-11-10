"""Run against an isolated PostgreSQL database named vinnot, never a real environment."""
import io
import json
import os
import uuid
from types import SimpleNamespace

import psycopg
import pytest
from PIL import Image

from wine_script import user_media as media

DSN = os.environ.get("USER_MEDIA_TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not DSN, reason="Explicit isolated PostgreSQL test database required")


class Store:
    exceptions = SimpleNamespace(ClientError=RuntimeError)

    def __init__(self):
        self.objects = {}

    def get_object(self, Bucket, Key):
        return {"Body": io.BytesIO(self.objects[Key]), "ContentType": "image/webp"}

    def put_object(self, Bucket, Key, Body, **kwargs):
        assert kwargs["IfNoneMatch"] == "*"
        assert Key not in self.objects
        self.objects[Key] = Body


@pytest.fixture
def database():
    # Independent schema keeps even parallel test runs isolated.
    schema = "media_test_" + uuid.uuid4().hex
    with psycopg.connect(DSN, autocommit=True) as c:
        c.execute(psycopg.sql.SQL("CREATE SCHEMA {}").format(psycopg.sql.Identifier(schema)))
        c.execute(psycopg.sql.SQL("SET search_path TO {}").format(psycopg.sql.Identifier(schema)))
        c.execute("CREATE TABLE external_effects(kind text)")
        c.execute("CREATE TABLE managed_cover_images(storage_provider text)")
        c.execute("CREATE TABLE users(id uuid PRIMARY KEY,profile_image_url text,updated_at timestamptz)")
        c.execute("CREATE TABLE wines(id uuid PRIMARY KEY,image_url text,bottle_image_url text,revision bigint DEFAULT 0,updated_at timestamptz)")
        c.execute("CREATE TABLE wine_submissions(id uuid PRIMARY KEY,image_url text,image_quarantined boolean DEFAULT false,updated_at timestamptz)")
        c.execute("CREATE TABLE events(image_url text)")
        c.execute("CREATE TABLE wine_routes(image_url text)")
        c.execute("CREATE TABLE wineries(image_url text,background_image_url text)")
        c.execute("CREATE TABLE r2_avatar_inventory(image_url text PRIMARY KEY,owner_id uuid)")
        c.execute("CREATE TABLE storage_operation_budgets(scope text,period text,operations bigint DEFAULT 0,bytes_reserved bigint DEFAULT 0,PRIMARY KEY(scope,period))")
        try:
            yield c
        finally:
            c.execute(psycopg.sql.SQL("DROP SCHEMA {} CASCADE").format(psycopg.sql.Identifier(schema)))


def seed(database):
    owner, submission, wine = (uuid.uuid4() for _ in range(3))
    avatar = f"/api/uploads/avatars/avatar_{owner}_12345.png"
    label = f"/api/uploads/wine-labels/wine_label_{submission}.jpg"
    database.execute("INSERT INTO users(id,profile_image_url) VALUES (%s,%s)", (owner, avatar))
    database.execute("INSERT INTO wines(id,image_url) VALUES (%s,%s)", (wine, label))
    database.execute("INSERT INTO wine_submissions(id,image_url) VALUES (%s,%s)", (submission, label))
    source = Store()
    raw = io.BytesIO()
    Image.new("RGB", (20, 30), "red").save(raw, "PNG")
    source.objects = {url.removeprefix("/api/uploads/"): raw.getvalue() for url in (avatar, label)}
    return owner, source


def test_verified_batch_is_atomic_idempotent_and_reversible(database, tmp_path):
    owner, source = seed(database)
    before = media.references(database)
    manifest = media.prepare(database, source, "development", tmp_path)
    assert len(manifest["objects"]) == 2
    assert len(manifest["references"]) == 3
    target = Store()
    media.stage(database, target, tmp_path)
    assert media.apply(database, tmp_path) == 3
    assert media.apply(database, tmp_path) == 0
    assert media.references(database) == []
    assert database.execute("SELECT count(*) FROM r2_avatar_inventory WHERE owner_id=%s", (owner,)).fetchone()[0] == 1
    assert media.apply(database, tmp_path, rollback=True) == 3
    assert media.references(database) == before
    assert len(source.objects) == 2  # No original deletion API exists.
    assert database.execute("SELECT revision FROM wines").fetchone()[0] == 2


def test_concurrent_change_rolls_back_all_previous_updates(database, tmp_path):
    _, source = seed(database)
    media.prepare(database, source, "development", tmp_path)
    media.stage(database, Store(), tmp_path)
    database.execute("UPDATE wines SET image_url='https://example.invalid/new-user-image.webp'")
    before = media.references(database)
    with pytest.raises(ValueError, match="Concurrent"):
        media.apply(database, tmp_path)
    assert media.references(database) == before
    assert database.execute("SELECT count(*) FROM r2_avatar_inventory").fetchone()[0] == 0


def test_missing_remote_verification_or_corrupt_backup_prevents_writes(database, tmp_path):
    _, source = seed(database)
    before = media.references(database)
    manifest = media.prepare(database, source, "development", tmp_path)
    with pytest.raises(FileNotFoundError):
        media.apply(database, tmp_path)
    (tmp_path / manifest["objects"][0]["backup"]).write_bytes(b"corrupt")
    with pytest.raises(ValueError, match="integrity"):
        media.stage(database, Store(), tmp_path)
    assert media.references(database) == before


def test_pending_cleanup_and_wrong_environment_are_rejected(database, tmp_path):
    _, source = seed(database)
    with pytest.raises(ValueError, match="database"):
        media.prepare(database, source, "production", tmp_path)
    database.execute("INSERT INTO external_effects VALUES ('public-label-cleanup')")
    with pytest.raises(ValueError, match="Pending"):
        media.prepare(database, source, "development", tmp_path)


def test_exhausted_durable_budget_blocks_put(database, tmp_path):
    _, source = seed(database)
    media.prepare(database, source, "development", tmp_path)
    database.execute("INSERT INTO storage_operation_budgets(scope,period,bytes_reserved) VALUES ('r2-storage','lifetime',536870912)")
    target = Store()
    with pytest.raises(ValueError, match="budget"):
        media.stage(database, target, tmp_path)
    assert not target.objects
