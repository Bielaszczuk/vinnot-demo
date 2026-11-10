"""Validated, non-secret destination identity."""

import hashlib
import json
import re
from dataclasses import dataclass
from importlib.metadata import version
from urllib.parse import urlsplit

POLICY = "webp-v1:icc-or-srgb:exif-allowlist:rights-xmp"


def validate_url(value, *, https=False):
    try:
        parsed = urlsplit(value)
        valid = (parsed.scheme in (("https",) if https else ("http", "https"))
                 and parsed.hostname and parsed.username is None and parsed.password is None
                 and not parsed.fragment and not any(c.isspace() for c in value))
        _ = parsed.port
    except ValueError:
        raise ValueError("Invalid URL") from None
    if not valid:
        raise ValueError("Invalid URL (HTTP(S), host, no userinfo or fragment required)")
    return parsed


@dataclass(frozen=True)
class Config:
    endpoint: str
    bucket: str
    public_base: str
    quality: int = 85

    def __post_init__(self):
        endpoint = validate_url(self.endpoint, https=True)
        public = validate_url(self.public_base, https=True)
        if endpoint.path not in ("", "/") or endpoint.query or public.query:
            raise ValueError("Destination URLs must not contain query parameters; endpoint must have no path")
        if not re.fullmatch(r"[a-z0-9][a-z0-9-]{1,61}[a-z0-9]", self.bucket):
            raise ValueError("Bucket must be a 3–63 character lowercase DNS-style name")
        if not 1 <= self.quality <= 100:
            raise ValueError("Quality must be between 1 and 100")
        object.__setattr__(self, "endpoint", self.endpoint.rstrip("/"))
        object.__setattr__(self, "public_base", self.public_base.rstrip("/"))

    def scope(self):
        # Credentials are deliberately excluded; rotation does not change object identity.
        value = [self.endpoint, self.bucket, self.public_base, self.quality, POLICY, version("Pillow")]
        return hashlib.sha256(json.dumps(value).encode()).hexdigest()
