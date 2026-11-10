"""Known catalogue placeholders are missing images, never migration assets."""

import re
from urllib.parse import urlsplit

PLACEHOLDER_SHA256 = "e43d955c611263ee997e199d43c23a052c20d0ad7bd0f3aec12ece6d9501bacd"
_DEFAULT_LABEL = re.compile(r"/thumbs/default_label_[0-9]+x[0-9]+\.jpg$")


def is_placeholder_source(url):
    parsed = urlsplit(url or "")
    return parsed.hostname == "images.vivino.com" and bool(_DEFAULT_LABEL.fullmatch(parsed.path))


def is_placeholder_object(key):
    return bool(key) and key.rsplit("/", 1)[-1] == PLACEHOLDER_SHA256 + ".webp"


def without_placeholder(row):
    if is_placeholder_source(row["original_url"]) or is_placeholder_object(row["object_key"]):
        return {**row, "new_url": None, "object_key": None}
    return row
