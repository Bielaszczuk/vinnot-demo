import csv

import pytest

from wine_script.config import Config
from wine_script.migrate import process_one
from wine_script.placeholders import PLACEHOLDER_SHA256, is_placeholder_source
from wine_script.release import PUBLIC_BASE, prepare_manifest, upload_one, validate_mapping, verify_object
from wine_script.release_cli import read_mapping
from wine_script.state import State

ID = '00000000-0000-4000-8000-000000000001'
SOURCE = 'https://images.vivino.com/thumbs/default_label_375x500.jpg'
CFG = Config('https://r2.example.invalid', 'vinnot-catalog-images', PUBLIC_BASE)


def test_known_source_skips_download_and_storage_for_both_pipelines():
    def forbidden(*_):
        pytest.fail('A missing label must not consume downloads or R2 operations')
    expected = dict(new_url=None, object_key=None)
    assert process_one(ID, SOURCE, CFG, None, downloader=forbidden) == expected
    assert upload_one(ID, SOURCE, CFG, None, downloader=forbidden) == expected
    assert is_placeholder_source(SOURCE + '?v=2')
    assert is_placeholder_source(SOURCE.replace('375x500', '150x200'))
    assert not is_placeholder_source(SOURCE.replace('images.vivino.com', 'winery.example'))
    assert not is_placeholder_source(SOURCE.replace('default_label', 'wine_label'))


def test_old_success_exports_as_null_without_reactivating_object(tmp_path):
    path = tmp_path/'state.sqlite'
    key = f'wines/ar/{ID}/{PLACEHOLDER_SHA256}.webp'
    with State(path, 'test') as state:
        state.prepare(ID, SOURCE)
        # Reproduce a success persisted by the original importer.
        state.connection.execute("UPDATE items SET status='success',verified=1,new_url=?,object_key=?",
                                 (PUBLIC_BASE+'/'+key, key))
        state.connection.commit()
    export = tmp_path/'mapping.csv'
    with State(path) as state:
        state.export(export)
    assert read_mapping(export) == [dict(id=ID, original_url=SOURCE, new_url=None, object_key=None)]
    with export.open() as file:
        assert list(csv.DictReader(file))[0]['new_url'] == ''


def test_manifest_allows_only_known_missing_labels_and_rejects_old_csv():
    dev = dict(id=ID, name='Wine', vintage=2023, winery_id=ID, wine_type='RED', country='ar',
               image_url=SOURCE, bottle_image_url=None, revision=1, updated_at='2026-10-05',
               is_active=True, created_by=None)
    manifest = prepare_manifest([dev], [{**dev, 'image_url': None}])
    row = dict(id=ID, original_url=SOURCE, new_url=None, object_key=None)
    validate_mapping([row], manifest)
    assert verify_object(row, CFG, None) == dict(id=ID, excluded='catalogue-placeholder')
    key = f'wines/ar/{ID}/{PLACEHOLDER_SHA256}.webp'
    with pytest.raises(ValueError, match='must remain NULL'):
        validate_mapping([{**row, 'new_url':PUBLIC_BASE+'/'+key, 'object_key':key}], manifest)
    other = {**dev, 'image_url':'https://images.vivino.com/thumbs/real.jpg'}
    manifest = prepare_manifest([other], [{**other, 'image_url':None}])
    with pytest.raises(ValueError, match='Invalid missing-image'):
        validate_mapping([{**row, 'original_url':other['image_url']}], manifest)
    with pytest.raises(ValueError, match='placeholder mapping'):
        validate_mapping([{**row, 'original_url':other['image_url'], 'new_url':PUBLIC_BASE+'/'+key,
                           'object_key':key}], manifest)
