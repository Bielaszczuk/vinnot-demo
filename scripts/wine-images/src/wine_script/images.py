"""Bounded raster conversion; color handling and metadata are explicit policies."""

import io
import re
import struct
import time
import xml.etree.ElementTree as ET
from contextlib import suppress

import requests
from PIL import Image, ImageCms, ImageOps, IptcImagePlugin
from defusedxml.ElementTree import fromstring
from defusedxml.common import DefusedXmlException

from wine_script.config import validate_url

MAX_BYTES = 20 * 1024 * 1024
MAX_PIXELS = 25_000_000
Image.MAX_IMAGE_PIXELS = MAX_PIXELS
FORMATS = ("JPEG", "PNG", "WEBP", "GIF", "TIFF", "BMP")
_srgb = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()
# LittleCMS inserts the current date; normalize this non-color header field so
# retries in another process produce the same WebP digest.
SRGB = _srgb[:24] + struct.pack(">6H", 2000, 1, 1, 0, 0, 0) + _srgb[36:]
# Camera identity, dates, resolution, exposure and lens data; no GPS, authors,
# comments, opaque MakerNote, serial numbers or arbitrary binary values.
EXIF_TAGS = {271, 272, 282, 283, 296, 306, 33432, 33434, 33437, 34850,
             34855, 36867, 36868, 37377, 37378, 37379, 37380, 37381,
             37383, 37384, 37385, 37386, 41986, 41987, 41988, 42036}
URL_TEXT = re.compile(r"(?:[a-z][a-z0-9+.-]*://|www\.)", re.I)
RIGHTS_TAGS = {
    "{http://purl.org/dc/elements/1.1/}rights",
    "{http://creativecommons.org/ns#}license",
    "{http://ns.adobe.com/xap/1.0/rights/}UsageTerms",
    "{http://ns.adobe.com/xap/1.0/rights/}WebStatement",
    "{http://ns.adobe.com/xap/1.0/rights/}Marked",
}


def download_image(url, session=None, *, max_bytes=MAX_BYTES, allowed_hosts=None):
    validate_url(url)
    if session is None:
        with requests.Session() as owned:
            # No ambient proxy credentials or .netrc authentication.
            owned.trust_env = False
            return download_image(url, owned, max_bytes=max_bytes, allowed_hosts=allowed_hosts)
    deadline = time.monotonic() + 60
    # Handle redirects explicitly so every destination is validated and bounded.
    for _ in range(6):
        parsed = validate_url(url)
        if allowed_hosts is not None:
            import ipaddress
            import socket
            if parsed.scheme != "https" or parsed.hostname not in allowed_hosts or parsed.port not in (None, 443):
                raise ValueError("Source host is outside the approved manifest origins")
            addresses = socket.getaddrinfo(parsed.hostname, 443, type=socket.SOCK_STREAM)
            if not addresses or any(not ipaddress.ip_address(item[4][0]).is_global for item in addresses):
                raise ValueError("Private source addresses are forbidden")
        with session.get(url, stream=True, timeout=(5, 20), allow_redirects=False,
                         headers={"Accept-Encoding": "identity"}) as response:
            if time.monotonic() > deadline:
                raise ValueError("Download time limit exceeded")
            if getattr(response, "status_code", 200) in (301, 302, 303, 307, 308):
                from urllib.parse import urljoin
                url = urljoin(url, response.headers.get("Location", ""))
                continue
            response.raise_for_status()
            if response.headers.get("Content-Encoding", "identity").lower() != "identity":
                raise ValueError("Unsupported HTTP content encoding")
            if int(response.headers.get("Content-Length", 0)) > max_bytes:
                raise ValueError("Download byte limit exceeded")
            output = io.BytesIO()
            for chunk in response.iter_content(chunk_size=64 * 1024):
                if time.monotonic() > deadline:
                    raise ValueError("Download time limit exceeded")
                if output.tell() + len(chunk) > max_bytes:
                    raise ValueError("Download byte limit exceeded")
                output.write(chunk)
            return output.getvalue()
    raise ValueError("Redirect limit exceeded")


def filtered_exif(values):
    result = {}
    for tag, value in values.items():
        if tag not in EXIF_TAGS or isinstance(value, bytes):
            continue
        # Rights are an explicit exception: retain license/copyright URLs.
        if isinstance(value, str) and (len(value) > 4096 or (tag != 33432 and URL_TEXT.search(value))):
            continue
        result[tag] = value
    return result


def safe_exif(image):
    source = image.getexif()
    values = dict(source)
    iptc = IptcImagePlugin.getiptcinfo(image) or {}
    if 33432 not in values and isinstance(iptc.get((2, 116)), bytes):
        encoding = "utf-8" if iptc.get((1, 90)) == b"\x1b%G" else "latin-1"
        values[33432] = iptc[(2, 116)].decode(encoding, errors="replace")
    result = Image.Exif()
    result.update(filtered_exif(values))
    if 34665 in source:
        nested = filtered_exif(source.get_ifd(34665))
        if nested:
            result[34665] = nested  # Preserve the standard EXIF sub-IFD location.
    return (result.tobytes() if result else b""), values.get(33432)


def safe_xmp(raw, copyright=None):
    """Rebuild only recognized rights fields; never copy the original packet."""
    source = None
    if isinstance(raw, str):
        raw = raw.encode()
    if raw and len(raw) <= 64 * 1024 and b"<!" not in raw:
        with suppress(ET.ParseError, DefusedXmlException):
            source = fromstring(raw, forbid_dtd=True)
    root = ET.Element("{adobe:ns:meta/}xmpmeta")
    rdf = ET.SubElement(root, "{http://www.w3.org/1999/02/22-rdf-syntax-ns#}RDF")
    description = ET.SubElement(rdf, "{http://www.w3.org/1999/02/22-rdf-syntax-ns#}Description")
    for node in source.iter() if source is not None else ():
        for tag, value in [(node.tag, " ".join(node.itertext()).strip()), *node.attrib.items()]:
            resource_tag = "{http://www.w3.org/1999/02/22-rdf-syntax-ns#}resource"
            resource = node.attrib.get(resource_tag) if tag == node.tag else None
            value = resource or value
            if tag in RIGHTS_TAGS and value and len(value) <= 4096:
                child = ET.SubElement(description, tag)
                if resource:
                    child.set(resource_tag, value)
                else:
                    child.text = value
    # Pillow serializes EXIF ASCII fields with replacement. Retain Unicode
    # copyright in an explicit rights field instead of silently losing it.
    if isinstance(copyright, str) and not copyright.isascii() and len(copyright) <= 4096:
        text = copyright.replace("\x00", "; ")
        text = text.translate({c: None for c in range(32) if c not in (9, 10, 13)})
        ET.SubElement(description, "{http://purl.org/dc/elements/1.1/}rights").text = text
    return ET.tostring(root) if len(description) else b""


def convert_image(data, quality, *, max_pixels=MAX_PIXELS, max_side=None, strip_metadata=False):
    if len(data) > MAX_BYTES:
        raise ValueError("Image byte limit exceeded")
    with Image.open(io.BytesIO(data), formats=FORMATS) as source:
        if source.width * source.height > max_pixels or max(source.size) > 16383:
            raise ValueError("Image pixel/dimension limit exceeded")
        if getattr(source, "n_frames", 1) != 1:
            raise ValueError("Multi-frame/animated images are not supported")
        if source.mode not in ("1", "L", "LA", "P", "RGB", "RGBA", "CMYK"):
            raise ValueError("Unsupported raster mode (including high-bit-depth input)")
        icc = source.info.get("icc_profile")
        if not icc and source.format == "PNG":
            gamma = source.info.get("gamma")
            if "srgb" not in source.info and gamma is not None and abs(gamma - 0.45455) > 0.0001:
                raise ValueError("Non-sRGB PNG gamma requires an ICC profile")
            chroma = source.info.get("chromaticity")
            standard = (0.3127, 0.329, 0.64, 0.33, 0.3, 0.6, 0.15, 0.06)
            if "srgb" not in source.info and chroma and any(abs(a-b) > 0.0001 for a, b in zip(chroma, standard, strict=True)):
                raise ValueError("Non-sRGB PNG chromaticity requires an ICC profile")
        exif, copyright = (b"", None) if strip_metadata else safe_exif(source)
        xmp = b"" if strip_metadata else safe_xmp(source.info.get("xmp"), copyright)
        oriented = ImageOps.exif_transpose(source)
        alpha = oriented.convert("RGBA").getchannel("A") if (
            "A" in oriented.getbands() or "transparency" in oriented.info) else None
        if icc:
            profile = ImageCms.ImageCmsProfile(io.BytesIO(icc))
            space = getattr(profile.profile, "xcolor_space", "").strip()
            if space == "RGB" and oriented.mode != "CMYK" and not strip_metadata:
                result = oriented.convert("RGBA" if alpha is not None else "RGB")
            else:
                if space == "RGB" and oriented.mode != "CMYK":
                    color_source = oriented.convert("RGB")
                elif space == "GRAY" and oriented.mode in ("1", "L", "LA"):
                    color_source = oriented.convert("L")
                elif space == "CMYK" and oriented.mode == "CMYK":
                    color_source = oriented
                else:
                    raise ValueError("ICC profile is incompatible with raster mode")
                result = ImageCms.profileToProfile(color_source, profile,
                                                  ImageCms.ImageCmsProfile(io.BytesIO(SRGB)), outputMode="RGB")
                if result is None:
                    raise ValueError("ICC conversion failed")
                icc = SRGB
        else:
            if oriented.mode == "CMYK":
                raise ValueError("CMYK input requires an ICC profile")
            result = oriented.convert("RGBA" if alpha is not None else "RGB")
            icc = SRGB
        if alpha is not None:
            result.putalpha(alpha)
        if max_side is not None:
            if max_side < 1:
                raise ValueError("Maximum side must be positive")
            result.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
        output = io.BytesIO()
        # Explicit arguments only: PNG text, IPTC and original XMP are not copied.
        if strip_metadata:
            result.info.clear()
        metadata = {} if strip_metadata else dict(icc_profile=icc, exif=exif, xmp=xmp)
        result.save(output, "WEBP", quality=quality, method=4, **metadata)
        if output.tell() > MAX_BYTES:
            raise ValueError("Encoded image byte limit exceeded")
        return output.getvalue()
