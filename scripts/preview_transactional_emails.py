#!/usr/bin/env python3
"""Render actual SES adapter bodies locally with fake recipients and no delivery."""
import argparse
import functools
import http.server
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8094)
    parser.add_argument("--output", type=Path, default=ROOT / "backend/target/email-previews")
    parser.add_argument("--serve", action="store_true", help="Serve previews on loopback after rendering")
    args = parser.parse_args()
    output = args.output.resolve()
    if not 1 <= args.port <= 65535:
        parser.error("port must be between 1 and 65535")
    maven = shutil.which("mvn")
    if not maven:
        parser.error("Maven is required (mvn)")
    subprocess.run([
        maven, "-q", "-f", str(ROOT / "backend/pom.xml"),
        "-Dtest=BrandedEmailTemplateTest,NotificationEmailPreviewTest",
        f"-Dvinnot.email.preview.directory={output}",
        f"-Dvinnot.email.preview.base-url=http://127.0.0.1:{args.port}", "test",
    ], check=True, cwd=ROOT)
    for relative in ["brand/mark.png", "brand/wordmark.png", "email/winery-v1.png"]:
        destination = output / "images" / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / "frontend-react/public/images" / relative, destination)
    names = ["verification", "password-reset", "email-confirmation", "email-changed", "welcome", "password-changed", "social-linked", "account-deactivated", "account-deleted", "wine-submission", "support", "event-attendee", "event-organizer", "event-cancelled-summary", "event-cancelled-attendee", "event-changed-attendee", "event-reminder", "newsletter", "payment-receipt", "payment-refund-requested", "payment-refunded", "payment-chargeback"]
    links = "".join(f'<li><a href="{name}.html">{name}</a> · <a href="{name}.txt">text</a></li>' for name in names)
    (output / "index.html").write_text(
        '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        '<title>Vinnot email previews</title><body style="font-family:Arial;margin:40px"><h1>Vinnot email previews</h1>'
        '<p>Local fixtures. No email was sent. Action links contain demo tokens and must not be used.</p>'
        f'<ul>{links}</ul></body></html>', encoding="utf-8")
    print(f"Previews: {output}")
    if args.serve:
        handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(output))
        with http.server.ThreadingHTTPServer(("127.0.0.1", args.port), handler) as server:
            print(f"Open http://127.0.0.1:{args.port} (Ctrl+C to stop)", flush=True)
            server.serve_forever()


if __name__ == "__main__":
    main()
