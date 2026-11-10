import copy
import io
import json
import threading
from concurrent.futures import ThreadPoolExecutor

import pytest
from PIL import Image

from wine_script.release import (Budget, BudgetExceeded, PUBLIC_BASE, digest, eligible,
    load_manifest, prepare_manifest, private_json, selection, upload_one, validate_mapping)
from wine_script.config import Config

ID = '00000000-0000-4000-8000-000000000001'
URL = 'https://images.vivino.com/thumbs/example.jpg'

def row():
    return dict(id=ID,name='Wine',vintage=2023,winery_id=ID,wine_type='RED',country='ar',
                image_url=URL,bottle_image_url=None,revision=1,updated_at='2026-10-05',
                is_active=True,created_by=None)

def manifest():
    dev=row();prod=row();prod['image_url']=None
    return prepare_manifest([dev],[prod])

@pytest.mark.parametrize('field,value', [('name','Other'),('vintage',2024),('winery_id',None),('wine_type','WHITE'),('country','us')])
def test_uuid_is_not_enough(field,value):
    prod=row();prod[field]=value
    with pytest.raises(ValueError,match='identity'):prepare_manifest([row()],[prod])

def test_manifest_rejects_duplicates_missing_inactive_and_private_origins():
    with pytest.raises(ValueError):prepare_manifest([row(),row()],[row()])
    with pytest.raises(ValueError):prepare_manifest([row()],[])
    for value in [dict(created_by=ID),dict(is_active=False),dict(image_url='https://127.0.0.1/a.jpg')]:
        bad=row();bad.update(value)
        with pytest.raises(ValueError):prepare_manifest([bad],[row()])

def test_manifest_tampering_and_scope(tmp_path):
    value=manifest();p=tmp_path/'manifest.json';private_json(p,value)
    assert load_manifest(p)==value
    value['items'][0]['dev']['image_url']+='?changed'
    private_json(p,value)
    with pytest.raises(ValueError):load_manifest(p)
    assert selection(manifest(),[ID])[0]['dev']['id']==ID
    with pytest.raises(ValueError):selection(manifest(),[ID,ID])

def test_concurrent_durable_budget_and_exhaustion(tmp_path):
    path=tmp_path/'budget.sqlite';b=Budget(path,writes=5,reads=5,storage=50)
    def reserve(_):
        try:b.reserve('write',10);return True
        except BudgetExceeded:return False
    with ThreadPoolExecutor(max_workers=8) as pool:
        assert sum(pool.map(reserve,range(20)))==5
    assert b.usage()==dict(writes=5,reads=0,reserved_bytes=50)
    b.close();b=Budget(path,writes=5,reads=5,storage=50)
    with pytest.raises(BudgetExceeded):b.reserve('write',1)
    assert b.usage()['writes']==5;b.close()

def test_guard_protects_user_images_and_concurrent_edits():
    previous=row();previous['image_url']=None
    current=copy.deepcopy(previous)
    assert eligible(current,previous,'new',environment='prod')=='apply'
    current['image_url']='/api/uploads/user.jpg'
    assert eligible(current,previous,'new',environment='prod')=='protected'
    current=copy.deepcopy(previous);current['revision']+=1
    assert eligible(current,previous,'new',environment='dev')=='conflict'
    current=copy.deepcopy(previous);current['created_by']=ID
    assert eligible(current,previous,'new',environment='dev')=='conflict'
    current=copy.deepcopy(previous);current['image_url']='new'
    assert eligible(current,previous,'new',environment='dev')=='unchanged'

def test_mapping_requires_manifest_source_uuid_and_own_host():
    m=manifest();key=f'wines/ar/{ID}/'+('a'*64)+'.webp'
    r=dict(id=ID,original_url=URL,object_key=key,new_url=PUBLIC_BASE+'/'+key)
    validate_mapping([r],m)
    for field,value in [('new_url','https://evil.example/a.webp'),('original_url',URL+'?changed'),('id','00000000-0000-4000-8000-000000000002')]:
        bad=dict(r);bad[field]=value
        with pytest.raises(ValueError):validate_mapping([bad],m)
    with pytest.raises(ValueError):validate_mapping([r,r],m)

def test_resized_immutable_upload_and_no_duplicate_put():
    from botocore.exceptions import ClientError
    class Store:
        objects={};puts=0
        def head_object(self,Key,**_):
            if Key not in self.objects:raise ClientError({'Error':{'Code':'404'}},'HeadObject')
            o=self.objects[Key];return dict(ContentLength=len(o['Body']),Metadata=o['Metadata'])
        def put_object(self,Key,**kw):
            assert kw['IfNoneMatch']=='*';self.objects[Key]=kw;self.puts+=1
    store=Store();cfg=Config('https://r2.example.invalid','vinnot-catalog-images',PUBLIC_BASE)
    source=io.BytesIO();Image.new('RGBA',(1200,1400),(100,0,10,0)).save(source,'PNG')
    result=upload_one(ID,URL,cfg,store,downloader=lambda _:source.getvalue())
    second=upload_one(ID,URL,cfg,store,downloader=lambda _:source.getvalue())
    assert second==result and store.puts==1
    with Image.open(io.BytesIO(store.objects[result['object_key']]['Body'])) as im:
        assert max(im.size)==1024 and im.mode=='RGBA'

def test_legacy_spaces_are_encoded_without_changing_origin_or_manifest():
    from wine_script.release import source_url
    original='https://images.vivino.com/wineries/1/wines/Rhone Syrah small_375x500.jpg'
    assert source_url(original)=='https://images.vivino.com/wineries/1/wines/Rhone%20Syrah%20small_375x500.jpg'
    dev=row();dev['image_url']=original
    assert prepare_manifest([dev],[row()])['items'][0]['dev']['image_url']==original
    with pytest.raises(ValueError):source_url('https://user:pass@images.vivino.com/a.jpg')

def test_release_removes_all_metadata_after_applying_orientation_and_color():
    from wine_script.images import convert_image, SRGB
    exif = Image.Exif()
    exif.update({274: 6, 271: 'Camera make', 272: 'Model', 306: '2026:10:05 12:00:00',
                 33432: 'Copyright Example https://example.org/license', 315: 'Private author',
                 37510: b'private comment', 42033: 'serial-number'})
    source = io.BytesIO()
    Image.new('RGB', (30, 40), 'red').save(source, 'JPEG', exif=exif, icc_profile=SRGB,
        xmp=b'<x:xmpmeta xmlns:x="adobe:ns:meta/">Private XMP Copyright</x:xmpmeta>')
    body = convert_image(source.getvalue(), 85, strip_metadata=True)
    with Image.open(io.BytesIO(body)) as image:
        assert not image.getexif()
        assert image.size == (40, 30)
        assert not set(image.info) & {'exif', 'xmp', 'icc_profile', 'comment'}
        assert b'Camera make' not in body and b'Private author' not in body
        assert b'Copyright Example' not in body

def test_release_strips_png_text_and_keeps_transparency():
    from wine_script.images import convert_image
    from PIL.PngImagePlugin import PngInfo
    tags = PngInfo();tags.add_text('Comment','Private comment');tags.add_itxt('License','Private license')
    source = io.BytesIO();image = Image.new('RGBA',(30,40),(200,10,20,0));image.putpixel((10,10),(200,10,20,255))
    image.save(source,'PNG',pnginfo=tags)
    body = convert_image(source.getvalue(),85,strip_metadata=True)
    with Image.open(io.BytesIO(body)) as output:
        assert output.mode == 'RGBA' and output.getpixel((0,0))[3] == 0
        assert output.getpixel((10,10))[3] == 255
        assert not set(output.info) & {'exif','xmp','icc_profile','comment','License','Comment'}
        assert b'Private' not in body

def test_slow_download_does_not_stall_other_workers_and_resume_skips_success(tmp_path):
    from wine_script.migrate import migrate
    from wine_script.state import State
    ids = [str(__import__('uuid').UUID(int=i)) for i in (1, 2, 3)]
    third_started = threading.Event()
    calls = []
    def process(id, *_):
        calls.append(id)
        if id == ids[0]:
            assert third_started.wait(2), 'A slow download stalled unrelated work'
        if id == ids[2]:
            third_started.set()
        return dict(object_key=id, new_url=PUBLIC_BASE+'/'+id)
    def fetch(_dsn, after, size):
        return [(id, URL) for id in ids if after is None or id > after][:size]
    cfg = Config('https://r2.example.invalid', 'vinnot-catalog-images', PUBLIC_BASE)
    with State(tmp_path/'state.sqlite', 'test') as state:
        assert migrate(None, cfg, state, None, threads=2, fetch=fetch, process=process)['failed'] == 0
        assert all(state.attempts(id) == 1 for id in ids)
        calls.clear()
        migrate(None, cfg, state, None, threads=2, fetch=fetch, process=process)
        assert calls == []

def test_cli_rejects_colliding_paths_and_public_credentials(tmp_path):
    from argparse import Namespace
    from wine_script.release_cli import validate_paths
    env = tmp_path/'env.json';env.write_text('{}');env.chmod(0o600)
    args = Namespace(manifest=tmp_path/'manifest.json', csv=env, env_file=env)
    with pytest.raises(ValueError,match='paths'):validate_paths(args)
    args.csv = tmp_path/'mapping.csv'
    validate_paths(args)
    env.chmod(0o644)
    with pytest.raises(ValueError,match='private'):validate_paths(args)


def test_production_writes_require_exact_explicit_manifest_before_accessing_database(tmp_path):
    from wine_script.release import apply_mapping, validate_write_scope
    approved = manifest()
    for token in (None, '', '0' * 64):
        with pytest.raises(ValueError, match='approval'):
            apply_mapping(None, approved, [], tmp_path/'journal.json', environment='prod',
                          write=True, production_manifest=token)
    validate_write_scope('prod', True, approved['sha256'], approved['sha256'])
    validate_write_scope('prod', False, None, approved['sha256'])
    validate_write_scope('dev', True, None, approved['sha256'])
    for environment, write in [('dev', True), ('prod', False), ('unknown', True)]:
        with pytest.raises(ValueError):
            validate_write_scope(environment, write, approved['sha256'], approved['sha256'])


def test_cli_scope_rejection_happens_before_credentials_or_database(tmp_path):
    from wine_script import release_cli
    approved = manifest()
    path = tmp_path/'manifest.json'
    from wine_script.release import private_json
    private_json(path, approved)
    env = tmp_path/'env.json'
    env.write_text('{}')
    env.chmod(0o600)
    with pytest.raises(ValueError, match='approval'):
        release_cli.main(['apply', '--manifest', str(path), '--env-file', str(env),
                          '--csv', str(tmp_path/'missing.csv'), '--journal', str(tmp_path/'journal.json'),
                          '--environment', 'prod', '--write'])


def test_approval_cannot_reuse_a_tampered_in_memory_manifest(tmp_path):
    from wine_script.release import apply_mapping
    approved = manifest()
    approved['items'][0]['prod']['revision'] += 1
    with pytest.raises(ValueError, match='digest'):
        apply_mapping(None, approved, [], tmp_path/'journal.json', environment='prod', write=True,
                      production_manifest=approved['sha256'])
