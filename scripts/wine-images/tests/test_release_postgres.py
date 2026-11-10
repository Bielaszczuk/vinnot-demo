"""Exercise production CAS/rollback only on a named disposable local cluster."""
import json
import os
import uuid

import psycopg
from psycopg.rows import dict_row
import pytest

from wine_script.release import PUBLIC_BASE, apply_mapping, prepare_manifest

DSN = os.environ.get('CATALOGUE_TEST_DATABASE_URL')
pytestmark = pytest.mark.skipif(not DSN, reason='Explicit disposable catalogue database required')


@pytest.fixture
def database():
    with psycopg.connect(DSN, autocommit=True, row_factory=dict_row) as connection:
        assert connection.execute('SHOW cluster_name').fetchone()['cluster_name'] == 'vinnot-catalog-promotion-test'
        schema = 'catalogue_test_' + uuid.uuid4().hex
        connection.execute(psycopg.sql.SQL('CREATE SCHEMA {}').format(psycopg.sql.Identifier(schema)))
        connection.execute(psycopg.sql.SQL('SET search_path TO {}').format(psycopg.sql.Identifier(schema)))
        connection.execute('CREATE TABLE countries(id uuid PRIMARY KEY,code text)')
        connection.execute('''CREATE TABLE wines(id uuid PRIMARY KEY,name text,vintage integer,winery_id uuid,
            wine_type text,country_id uuid,image_url varchar(500),bottle_image_url varchar(500),
            revision bigint,updated_at timestamptz,is_active boolean,created_by uuid)''')
        connection.execute('CREATE TABLE reviews(wine_id uuid,body text)')
        try:
            yield connection
        finally:
            connection.execute(psycopg.sql.SQL('DROP SCHEMA {} CASCADE').format(psycopg.sql.Identifier(schema)))


def seed(connection, count=2):
    country = str(uuid.uuid4())
    connection.execute("INSERT INTO countries VALUES (%s,'ar')", (country,))
    for i in range(count):
        connection.execute('''INSERT INTO wines VALUES (%s,'Wine',2023,%s,'RED',%s,%s,
            'https://example.invalid/bottle.webp',1,'2026-10-05',true,NULL)''',
            (str(uuid.uuid4()), country, country, None if i == 0 else 'https://example.invalid/owned.webp'))
    snapshot = connection.execute('''SELECT w.id::text,w.name,w.vintage,w.winery_id::text,w.wine_type,
        c.code AS country,w.image_url,w.bottle_image_url,w.revision,w.updated_at::text,w.is_active,w.created_by::text
        FROM wines w JOIN countries c ON c.id=w.country_id ORDER BY w.image_url NULLS FIRST,w.id''').fetchall()
    source = [{**row, 'image_url': 'https://images.vivino.com/thumbs/test.jpg'} for row in snapshot]
    manifest = prepare_manifest(source, snapshot)
    rows = []
    for row in source:
        key = 'wines/ar/' + row['id'] + '/' + 'a' * 64 + '.webp'
        rows.append(dict(id=row['id'], original_url=row['image_url'], new_url=PUBLIC_BASE+'/'+key, object_key=key))
    connection.execute("INSERT INTO reviews VALUES (%s,'Retain review')", (rows[0]['id'],))
    return manifest, rows, snapshot


def test_production_dry_run_apply_idempotence_protected_photos_and_rollback(database, tmp_path):
    manifest, rows, before = seed(database)
    journal = tmp_path/'journal.json'
    result = apply_mapping(database, manifest, rows, journal, environment='prod')
    assert result['would_apply'] == 1 and result['protected'] == 1
    assert not journal.exists()
    result = apply_mapping(database, manifest, rows, journal, environment='prod', write=True,
                           production_manifest=manifest['sha256'])
    assert result['applied'] == 1 and result['protected'] == 1
    saved = json.loads(journal.read_text())
    assert set(saved['rows']) == {rows[0]['id']}
    assert saved['rows'][rows[0]['id']]['old'] == before[0]
    current = database.execute('SELECT id::text,image_url,bottle_image_url,revision FROM wines ORDER BY image_url').fetchall()
    by_id = {row['id']: row for row in current}
    assert by_id[rows[0]['id']]['image_url'] == rows[0]['new_url']
    assert by_id[rows[0]['id']]['revision'] == 2
    assert by_id[rows[1]['id']]['image_url'] == before[1]['image_url']
    assert by_id[rows[1]['id']]['revision'] == 1
    assert all(row['bottle_image_url'] == before[0]['bottle_image_url'] for row in current)
    assert database.execute('SELECT count(*) AS n FROM reviews').fetchone()['n'] == 1
    result = apply_mapping(database, manifest, rows, journal, environment='prod', write=True,
                           production_manifest=manifest['sha256'])
    assert result['applied'] == 0 and result['unchanged'] == 1
    result = apply_mapping(database, manifest, rows[:1], journal, environment='prod', write=True, rollback=True,
                           production_manifest=manifest['sha256'])
    assert result['applied'] == 1
    restored = database.execute('SELECT image_url,revision FROM wines WHERE id=%s', (rows[0]['id'],)).fetchone()
    assert restored == {'image_url': None, 'revision': 3}


def test_concurrent_change_and_newer_edit_are_not_overwritten_or_reverted(database, tmp_path):
    manifest, rows, _ = seed(database, count=1)
    journal = tmp_path/'journal.json'
    database.execute('UPDATE wines SET revision=revision+1')
    result = apply_mapping(database, manifest, rows, journal, environment='prod', write=True,
                           production_manifest=manifest['sha256'])
    assert result['conflict'] == 1 and result['applied'] == 0 and not journal.exists()
    fresh = {**manifest['items'][0]['prod'], 'revision': 2}
    manifest = prepare_manifest([manifest['items'][0]['dev']], [fresh])
    result = apply_mapping(database, manifest, rows, journal, environment='prod', write=True,
                           production_manifest=manifest['sha256'])
    assert result['applied'] == 1
    database.execute('UPDATE wines SET revision=revision+1')
    result = apply_mapping(database, manifest, rows, journal, environment='prod', write=True, rollback=True,
                           production_manifest=manifest['sha256'])
    assert result['conflict'] == 1 and result['applied'] == 0
    assert database.execute('SELECT image_url FROM wines').fetchone()['image_url'] == rows[0]['new_url']


def test_database_identity_and_journal_destination_fail_before_writing(database, tmp_path):
    manifest, rows, _ = seed(database, count=1)
    journal = tmp_path/'journal.json'
    with pytest.raises(ValueError, match='Database target'):
        apply_mapping(database, manifest, rows, journal, environment='dev', write=True)
    journal.write_text(json.dumps({'manifest':manifest['sha256'], 'environment':'dev', 'rows':{}}))
    with pytest.raises(ValueError, match='different release'):
        apply_mapping(database, manifest, rows, journal, environment='prod', write=True,
                      production_manifest=manifest['sha256'])
    assert database.execute('SELECT image_url FROM wines').fetchone()['image_url'] is None


def test_missing_label_preserves_production_null_without_a_database_update(database, tmp_path):
    from wine_script.release import eligible
    manifest, rows, _ = seed(database, count=1)
    source = 'https://images.vivino.com/thumbs/default_label_375x500.jpg'
    dev = {**manifest['items'][0]['dev'], 'image_url': source}
    prod = manifest['items'][0]['prod']
    manifest = prepare_manifest([dev], [prod])
    row = {**rows[0], 'original_url': source, 'new_url': None, 'object_key': None}
    assert eligible(dev, dev, None, environment='dev') == 'apply'
    result = apply_mapping(database, manifest, [row], tmp_path/'missing.json', environment='prod',
                           write=True, production_manifest=manifest['sha256'])
    assert result['unchanged'] == 1 and result['applied'] == 0
    assert database.execute('SELECT image_url FROM wines').fetchone()['image_url'] is None
