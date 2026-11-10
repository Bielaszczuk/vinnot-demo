#!/usr/bin/env python3
"""Build bundled/CDN artwork from the existing transparent masters (requires Pillow).

Does not fetch remote images, change catalog URLs, or flatten alpha onto a background.
Run from any directory; generated resources are committed with their consumers.
"""
from pathlib import Path
import argparse
import shutil

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MOBILE = ROOT / "frontend-mobile/assets/images"
WEB = ROOT / "frontend-react/src/shared/assets"
PUBLIC = ROOT / "frontend-react/public/images"
ILLUSTRATIONS = (
    "403", "404", "429", "500", "503", "emptycellar", "event", "legal",
    "noconection", "privacy", "routes", "timeout", "winery",
    "nowines", "notickets", "noreviews", "community", "partnerevents", "notifications",
)
# Busier scenes need a lower quality to stay under the 260 KB budget.
ILLUSTRATION_QUALITY = {"community": 76, "partnerevents": 64}


def webp(source: Path, destination: Path, size: tuple[int, int], quality: int = 80) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as original:
        image = original.convert("RGBA" if original.mode in ("RGBA", "P") else "RGB")
        image.thumbnail(size, Image.Resampling.LANCZOS)
        image.save(destination, "WEBP", quality=quality, method=6, exact=True)


def build() -> None:
    for name in ILLUSTRATIONS:
        source = MOBILE / "common" / f"{name}.png"
        with Image.open(source) as image:
            if image.mode != "RGBA" or image.getchannel("A").getextrema()[0] != 0:
                raise ValueError(f"Transparent master required: {source}")
        destination = MOBILE / "illustrations" / f"{name}.webp"
        webp(source, destination, (960, 960), ILLUSTRATION_QUALITY.get(name, 80))
        (WEB / "illustrations").mkdir(parents=True, exist_ok=True)
        shutil.copyfile(destination, WEB / "illustrations" / destination.name)

    for name in ("redglass", "whiteglass", "roseglass", "sparklinglass"):
        # Keep the already optimized native derivatives byte-identical on web.
        destination = WEB / "glasses" / f"{name}.webp"
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(MOBILE / "common" / destination.name, destination)

    for name in ("wineyard", "winewithmap", "wineriecavabar", "redgrapes"):
        webp(MOBILE / "winery" / f"{name}.jpg", WEB / "routes" / f"{name}.webp", (1280, 960))

    for name in ("winebottle", "winebottle2"):
        destination = MOBILE / "mock" / f"{name}.webp"
        webp(MOBILE / "mock" / f"{name}.jpg", destination, (600, 800))
        shutil.copyfile(destination, PUBLIC / "mock" / destination.name)

    # Email clients do not uniformly support WebP. Indexed PNG keeps transparency
    # and supplies 2x pixels for the 360px hero without sending the multi-MB master.
    with Image.open(MOBILE / "common/winery.png") as original:
        original.thumbnail((720, 540), Image.Resampling.LANCZOS)
        image = original.quantize(colors=256, method=Image.Quantize.FASTOCTREE)
        destination = PUBLIC / "email/winery-v1.png"
        destination.parent.mkdir(parents=True, exist_ok=True)
        image.save(destination, "PNG", optimize=True)


def check() -> None:
    for name in ILLUSTRATIONS:
        native = MOBILE / "illustrations" / f"{name}.webp"
        web = WEB / "illustrations" / native.name
        assert native.read_bytes() == web.read_bytes(), f"Web/mobile mismatch: {name}"
        assert native.stat().st_size < 260_000, f"Illustration exceeds budget: {name}"
        with Image.open(native) as image, Image.open(MOBILE / "common" / f"{name}.png") as master:
            assert image.format == "WEBP" and image.mode == "RGBA", name
            assert max(image.size) <= 960, name
            assert abs(image.width / image.height - master.width / master.height) < 0.002, name
            assert image.getchannel("A").getextrema() == (0, 255), f"Flattened alpha: {name}"
            assert image.getpixel((0, 0))[3] == 0, f"Opaque border: {name}"
        for directory in (MOBILE / "illustrations", PUBLIC / "illustrations"):
            assert not (directory / f"{name}.jpg").exists(), f"Flattened duplicate: {name}"
    email = PUBLIC / "email/winery-v1.png"
    assert email.stat().st_size < 180_000, "Email hero exceeds budget"
    with Image.open(email) as image:
        assert image.format == "PNG" and image.size == (720, 540)
        assert image.convert("RGBA").getchannel("A").getextrema() == (0, 255)
    print("Artwork verified: matching web/mobile WebP, transparent edges, size budgets, email PNG.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verify existing assets without rewriting")
    args = parser.parse_args()
    if not args.check:
        build()
    check()
