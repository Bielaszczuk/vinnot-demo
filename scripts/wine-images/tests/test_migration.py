import csv
import hashlib
import io
import struct
import uuid
from typing import Any

import pytest
from PIL import Image, ImageCms, IptcImagePlugin, PngImagePlugin
from botocore.exceptions import ClientError
from defusedxml.ElementTree import fromstring

from wine_script import state as progress
from wine_script.config import Config
from wine_script.images import convert_image, download_image
from wine_script.migrate import fetch_batch, migrate, process_one

State = progress.State


ID = str(uuid.UUID(int=1))
URL = "https://images.example/wine.png"


def config(**changes):
    values: dict[str, Any] = {"endpoint": "https://account.r2.cloudflarestorage.com", "bucket": "wines",
                              "public_base": "https://cdn.example/images", "quality": 85}
    values.update(changes)
    return Config(**values)


def png():
    out = io.BytesIO()
    Image.new("RGBA", (3, 2), (255, 0, 0, 80)).save(out, "PNG")
    return out.getvalue()


class Store:
    def __init__(self):
        self.objects = {}
        self.puts = 0
        self.bad_head = False

    def head_object(self, **kwargs):
        key = kwargs["Key"]
        if key not in self.objects:
            raise ClientError({"Error": {"Code": "404"}}, "HeadObject")
        body, metadata = self.objects[key]
        return {"ContentLength": len(body) + int(self.bad_head), "Metadata": metadata,
                "ETag": "not-a-sha256"}

    def put_object(self, **kwargs):
        self.puts += 1
        self.objects[kwargs["Key"]] = (kwargs["Body"], kwargs["Metadata"])


def test_transparency_orientation_and_metadata():
    image = Image.new("RGBA", (3, 2), (20, 70, 110, 80))
    exif = Image.Exif()
    exif[274] = 6
    exif[315] = "An author"
    exif[33432] = "Copyright owner; CC BY"
    exif[271] = "https://tracking.example"
    exif[37500] = b"opaque vendor data"
    source = io.BytesIO()
    image.save(source, "PNG", exif=exif)
    output = Image.open(io.BytesIO(convert_image(source.getvalue(), 85)))
    assert output.size == (2, 3)
    pixel = output.getpixel((0, 0))
    assert isinstance(pixel, tuple) and pixel[3] == 80
    metadata = output.getexif()
    assert metadata[33432] == "Copyright owner; CC BY"
    assert all(tag not in metadata for tag in (274, 315, 271, 37500))


def test_exif_sub_ifd_preserves_exposure_not_provenance():
    image = Image.new("RGB", (3, 2), "blue")
    exif = Image.Exif()
    exif[34665] = {33434: 0.125, 37510: b"Author comment", 37500: b"vendor provenance"}
    source = io.BytesIO()
    image.save(source, "JPEG", exif=exif)
    metadata = Image.open(io.BytesIO(convert_image(source.getvalue(), 85))).getexif()
    assert metadata.get_ifd(34665)[33434] == 0.125
    assert 37510 not in metadata.get_ifd(34665) and 37500 not in metadata.get_ifd(34665)


def test_iptc_copyright_survives_unicode_serialization(monkeypatch):
    rights = "Copyright © Winery; CC BY"
    monkeypatch.setattr(IptcImagePlugin, "getiptcinfo", lambda _: {
        (1, 90): b"\x1b%G", (2, 116): rights.encode(), (2, 80): b"Private author",
    })
    output = Image.open(io.BytesIO(convert_image(png(), 85)))
    packet = fromstring(output.info["xmp"])
    field = packet.find(".//{http://purl.org/dc/elements/1.1/}rights")
    assert field is not None and field.text == rights
    assert b"Private author" not in output.info["xmp"]


def test_xmp_resource_license():
    image = Image.new("RGB", (3, 2), "blue")
    xmp = b'''<x:xmpmeta xmlns:x="adobe:ns:meta/" xmlns:cc="http://creativecommons.org/ns#"
        xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
        <cc:license rdf:resource="https://license.example/by"/></x:xmpmeta>'''
    source = io.BytesIO()
    image.save(source, "WEBP", xmp=xmp)
    result = Image.open(io.BytesIO(convert_image(source.getvalue(), 85)))
    assert b"https://license.example/by" in result.info["xmp"]


def test_palette_transparency():
    image = Image.new("P", (2, 1))
    image.putpalette([255, 0, 0, 0, 0, 255] + [0] * 762)
    image.putpixel((1, 0), 1)
    source = io.BytesIO()
    image.save(source, "GIF", transparency=0)
    result = Image.open(io.BytesIO(convert_image(source.getvalue(), 85))).convert("RGBA")
    assert result.getchannel("A").getpixel((0, 0)) == 0
    assert result.getchannel("A").getpixel((1, 0)) == 255


def test_animation_and_pixel_limit_rejected():
    out = io.BytesIO()
    frames = [Image.new("RGB", (2, 2), color) for color in ("red", "blue")]
    frames[0].save(out, "GIF", save_all=True, append_images=frames[1:])
    with pytest.raises(ValueError, match="animated"):
        convert_image(out.getvalue(), 85)
    with pytest.raises(ValueError, match="pixel"):
        convert_image(png(), 85, max_pixels=5)


def test_icc_preserved_and_plain_png_color():
    profile = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()
    out = io.BytesIO()
    Image.new("RGB", (2, 2), (50, 80, 120)).save(out, "PNG", icc_profile=profile)
    result = Image.open(io.BytesIO(convert_image(out.getvalue(), 85)))
    assert result.info["icc_profile"] == profile
    assert Image.open(io.BytesIO(convert_image(png(), 85))).mode == "RGBA"


def test_srgb_gamma_png_and_stable_profile():
    chunks = PngImagePlugin.PngInfo()
    chunks.add(b"sRGB", b"\x00")
    chunks.add(b"gAMA", struct.pack(">I", 45455))
    out = io.BytesIO()
    Image.new("RGBA", (4, 4), (50, 80, 120, 60)).save(out, "PNG", pnginfo=chunks)
    result = Image.open(io.BytesIO(convert_image(out.getvalue(), 100)))
    pixel = result.getpixel((0, 0))
    assert isinstance(pixel, tuple) and pixel[3] == 60
    assert all(abs(pixel[i] - color) < 5 for i, color in enumerate((50, 80, 120)))
    # Synthesized ICC timestamps must not vary between retry processes.
    assert struct.unpack(">6H", result.info["icc_profile"][24:36]) == (2000, 1, 1, 0, 0, 0)


def test_xmp_rights_only_and_unknown_gamma():
    xmp = b'''<x:xmpmeta xmlns:x="adobe:ns:meta/" xmlns:dc="http://purl.org/dc/elements/1.1/"
        xmlns:cc="http://creativecommons.org/ns#"><dc:creator>Author</dc:creator>
        <dc:rights>Copyright owner</dc:rights><cc:license>https://license.example/by</cc:license>
        <dc:source>https://tracking.example</dc:source></x:xmpmeta>'''
    out = io.BytesIO()
    Image.new("RGB", (2, 2), "red").save(out, "WEBP", xmp=xmp)
    result = Image.open(io.BytesIO(convert_image(out.getvalue(), 85)))
    packet = result.info["xmp"]
    assert b"Copyright owner" in packet and b"https://license.example/by" in packet
    assert b"Author" not in packet and b"tracking" not in packet
    chunks = PngImagePlugin.PngInfo()
    chunks.add(b"gAMA", struct.pack(">I", 100000))
    out = io.BytesIO()
    Image.new("RGB", (2, 2), "red").save(out, "PNG", pnginfo=chunks)
    with pytest.raises(ValueError, match="gamma"):
        convert_image(out.getvalue(), 85)


def test_stream_limit_and_url_validation():
    class Response:
        headers = {}
        def __enter__(self):
            return self
        def __exit__(self, exc_type, exc_value, traceback):
            pass
        def raise_for_status(self):
            pass
        def iter_content(self, chunk_size):
            yield b"x" * 6
    class Session:
        def get(self, url, **kwargs):
            assert kwargs["stream"] and kwargs["allow_redirects"] is False
            assert kwargs["timeout"] == (5, 20)
            return Response()
    with pytest.raises(ValueError, match="byte"):
        download_image(URL, Session(), max_bytes=5)
    with pytest.raises(ValueError, match="URL"):
        download_image("file:///private", Session())
    with pytest.raises(ValueError):
        config(endpoint="http://insecure.example")
    with pytest.raises(ValueError):
        config(public_base="https://user:secret@cdn.example")


@pytest.mark.parametrize("endpoint", [
    "https://@r2.example.invalid", "https://r2.example.invalid/#fragment",
    "https://r2.example.invalid/?signed=token", "https://r2.example.invalid/api",
    "https://r2.example.invalid:bad",
])
def test_invalid_destination_shapes(endpoint):
    with pytest.raises(ValueError):
        config(endpoint=endpoint)


def test_crash_window_verification_and_changed_source():
    store = Store()
    cfg = config()
    first = process_one(ID, URL, cfg, store, downloader=lambda url: png())
    second = process_one(ID, URL, cfg, store, downloader=lambda url: png())
    assert first == second
    assert store.puts == 1
    assert first["object_key"] == f"vinnot-{ID}.webp"
    assert store.objects[first["object_key"]][1]["sha256"] == hashlib.sha256(
        store.objects[first["object_key"]][0]).hexdigest()
    process_one(ID, URL + "?revision=2", cfg, store, downloader=lambda url: png())
    assert store.puts == 2
    store.bad_head = True
    with pytest.raises(ValueError, match="verification"):
        process_one(ID, URL, cfg, store, downloader=lambda url: png())


def test_state_scope_source_change_and_atomic_export(tmp_path):
    path = tmp_path / "progress.sqlite"
    cfg = config()
    with State(path, cfg.scope()) as state:
        assert state.prepare(ID, URL)
        state.begin_attempt(ID)
        state.succeed(ID, {"object_key": f"vinnot-{ID}.webp", "new_url": "https://cdn.example/new"})
        assert not state.prepare(ID, URL)
        csv_path = tmp_path / "result.csv"
        state.export(csv_path)
        with csv_path.open() as file:
            rows = list(csv.DictReader(file))
        assert rows[0]["original_url"] == URL
        assert list(rows[0]) == ["id", "original_url", "new_url", "object_key"]
        assert state.prepare(ID, URL + "?changed")
        assert state.attempts(ID) == 0
        state.export(csv_path)
        assert csv_path.read_text().count("\n") == 1
    with pytest.raises(ValueError, match="configuration"):
        State(path, config(quality=90).scope())
    with State(path) as state:
        state.export(tmp_path / "offline.csv")


@pytest.mark.parametrize("changes", [
    {"endpoint": "https://other.r2.cloudflarestorage.com"},
    {"bucket": "other-wines"},
    {"public_base": "https://other.example"},
    {"quality": 86},
])
def test_all_destination_changes_reject_state(tmp_path, changes):
    path = tmp_path / "state.sqlite"
    with State(path, config().scope()):
        pass
    with pytest.raises(ValueError, match="configuration"):
        State(path, config(**changes).scope())


def test_head_permission_failure_and_sha_mismatch():
    store = Store()
    cfg = config()
    result = process_one(ID, URL, cfg, store, downloader=lambda _: png())
    store.objects[result["object_key"]][1]["sha256"] = "incorrect"
    process_one(ID, URL, cfg, store, downloader=lambda _: png())
    assert store.puts == 2
    class Denied(Store):
        def head_object(self, **kwargs):
            raise ClientError({"Error": {"Code": "403"}}, "HeadObject")
    denied = Denied()
    with pytest.raises(ClientError):
        process_one(ID, URL, cfg, denied, downloader=lambda _: png())
    assert denied.puts == 0


def test_export_failure_keeps_previous_csv(tmp_path, monkeypatch):
    path = tmp_path / "output.csv"
    path.write_text("previous export")
    def fail_replace(*args):
        raise OSError("fake failure")
    monkeypatch.setattr("wine_script.state.os.replace", fail_replace)
    with State(tmp_path / "state.sqlite", config().scope()) as state, pytest.raises(OSError):
        state.export(path)
    assert path.read_text() == "previous export"


def test_http_compression_is_rejected_before_decoding():
    class Response:
        headers = {"Content-Encoding": "gzip"}
        def __enter__(self):
            return self
        def __exit__(self, exc_type, exc_value, traceback):
            pass
        def raise_for_status(self):
            pass
        def iter_content(self, chunk_size):
            pytest.fail("Compressed response must not be decoded")
    class Session:
        def get(self, *args, **kwargs):
            return Response()
    with pytest.raises(ValueError, match="encoding"):
        download_image(URL, Session())


def test_redirect_validation_and_content_length():
    class Response:
        status_code = 302
        headers = {"Location": "file:///private"}
        def raise_for_status(self):
            pass
        def __enter__(self):
            return self
        def __exit__(self, exc_type, exc_value, traceback):
            pass
    class Session:
        def get(self, *args, **kwargs):
            return Response()
    with pytest.raises(ValueError, match="URL"):
        download_image(URL, Session())
    Response.status_code = 200
    Response.headers = {"Content-Length": "100"}
    with pytest.raises(ValueError, match="byte"):
        download_image(URL, Session(), max_bytes=10)


def test_readonly_selection_connection_released():
    events = []
    class Cursor:
        def __enter__(self):
            return self
        def __exit__(self, exc_type, exc_value, traceback):
            pass
        def execute(self, sql, params=None):
            events.append((sql, params))
        def fetchall(self):
            return [(uuid.UUID(ID), URL)]
    class Connection:
        def cursor(self):
            return Cursor()
        def __enter__(self):
            return self
        def __exit__(self, exc_type, exc_value, traceback):
            events.append("closed")
    def connect(dsn):
        return Connection()
    assert fetch_batch("not-a-secret", None, 100, connect=connect) == [(ID, URL)]
    assert events[-1] == "closed"
    query, params = events[1]
    assert events[0][0] == "SET TRANSACTION READ ONLY"
    assert "public.wines" in query and "public.countries" in query
    assert "country_id" in query and "c.code = 'ar'" in query
    assert "image_url" in query and "bottle_image_url" not in query
    assert "btrim" in query and "[^[:space:]]" in query and "ORDER BY w.id" in query
    assert params == (None, None, 100)
    fetch_batch("fake", ID, 2, connect=connect)
    assert events[-2][1] == (ID, ID, 2)


def test_pilot_resume_and_bounded_failures(tmp_path):
    rows = [(str(uuid.UUID(int=i)), URL) for i in range(1, 106)]
    calls = []
    def fetch(dsn, after, limit):
        calls.append((after, limit))
        return [row for row in rows if after is None or row[0] > after][:limit]
    work = []
    def process(id, url, cfg, store):
        work.append(id)
        if id == ID:
            raise RuntimeError("secret must not enter state")
        return {"object_key": f"vinnot-{id}.webp", "new_url": "https://cdn.example/" + id}
    with State(tmp_path / "s.sqlite", config().scope()) as state:
        migrate("fake", config(), state, None, fetch=fetch, process=process, sleep=lambda _: None)
        assert len(set(work)) == 100
        assert work.count(ID) == 3
        assert state.attempts(ID) == 3
        assert "secret" not in state.connection.execute("SELECT error FROM items WHERE id=?", (ID,)).fetchone()[0]
        work.clear()
        migrate("fake", config(), state, None, fetch=fetch, process=process, sleep=lambda _: None)
        assert work == []
        migrate("fake", config(), state, None, limit=None, fetch=fetch, process=process, sleep=lambda _: None)
        assert len(work) == 5
    assert calls[0] == (None, 100)
    assert calls[-1] == (rows[-1][0], 500)
