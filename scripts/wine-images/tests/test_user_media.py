import io
import uuid

import pytest
from PIL import Image

from wine_script.user_media import optimize, source_key, MAX_INPUT_BYTES


def test_orients_bounds_and_removes_metadata_without_enlarging():
    source = Image.new("RGB", (1000, 700), "red")
    exif = Image.Exif()
    exif[274] = 6
    exif[315] = "Private test owner"
    data = io.BytesIO()
    source.save(data, "JPEG", exif=exif)
    result = Image.open(io.BytesIO(optimize(data.getvalue(), avatar=True)))
    assert result.format == "WEBP"
    assert result.size == (358, 512)
    assert not result.getexif()
    assert not {"icc_profile", "xmp"}.intersection(result.info)


def test_preserves_transparency_and_does_not_upscale():
    data = io.BytesIO()
    Image.new("RGBA", (16, 12), (100, 20, 50, 0)).save(data, "PNG")
    result = Image.open(io.BytesIO(optimize(data.getvalue())))
    assert result.size == (16, 12)
    assert result.getpixel((0, 0))[3] == 0


def test_rejects_oversized_or_non_image_input():
    with pytest.raises(ValueError, match="byte limit"):
        optimize(b"x" * (MAX_INPUT_BYTES + 1))
    with pytest.raises(OSError):
        optimize(b"<svg>not a raster</svg>")


def test_requires_avatar_ownership_and_accepts_legacy_timestamp_names():
    owner = str(uuid.uuid4())
    row = {"table": "users", "id": owner, "old_url": f"/api/uploads/avatars/avatar_{owner}_1781993163394.png"}
    assert source_key(row) == (row["old_url"].removeprefix("/api/uploads/"), True, owner)
    with pytest.raises(ValueError):
        source_key({**row, "id": str(uuid.uuid4())})


@pytest.mark.parametrize("url", ["https://images.vivino.com/file.jpg", "https://images.vinnot.com/wines/ar/id/file.webp",
                                 "/api/uploads/avatars/../../file.jpg", "/api/admin/wine-submissions/id/image"])
def test_excludes_catalogue_external_and_private_sources(url):
    with pytest.raises(ValueError):
        source_key({"table": "wines", "id": str(uuid.uuid4()), "old_url": url})


def test_submission_must_own_its_label_but_wine_can_reference_it():
    submission, wine = str(uuid.uuid4()), str(uuid.uuid4())
    url = f"/api/uploads/wine-labels/wine_label_{submission}.jpg"
    assert source_key({"table": "wines", "id": wine, "old_url": url})[2] == submission
    with pytest.raises(ValueError):
        source_key({"table": "wine_submissions", "id": wine, "old_url": url})
