"""Read-only UUID selection and verified, idempotent object uploads."""

import hashlib
import time
import uuid
from collections import deque
from concurrent.futures import FIRST_COMPLETED, ThreadPoolExecutor, wait

import psycopg
from botocore.exceptions import ClientError

from .images import convert_image, download_image
from .placeholders import PLACEHOLDER_SHA256, is_placeholder_source


def fetch_batch(dsn, after, limit, *, connect=psycopg.connect):
    # Fully materialize only one batch; both transaction and connection close
    # before returning, hence before any image download/upload can begin.
    with connect(dsn) as connection, connection.cursor() as cursor:
        cursor.execute("SET TRANSACTION READ ONLY")
        cursor.execute("""SELECT w.id, w.image_url
            FROM public.wines AS w
            JOIN public.countries AS c ON c.id = w.country_id
            WHERE c.code = 'ar' AND w.image_url IS NOT NULL AND btrim(w.image_url) <> ''
              AND w.image_url ~ '[^[:space:]]'
              AND (%s::uuid IS NULL OR w.id > %s::uuid)
            ORDER BY w.id LIMIT %s""", (after, after, limit))
        return [(str(id), url) for id, url in cursor.fetchall()]


def head(store, cfg, key):
    try:
        return store.head_object(Bucket=cfg.bucket, Key=key)
    except ClientError as error:
        if error.response.get("Error", {}).get("Code") in ("404", "NoSuchKey", "NotFound"):
            return None
        raise


def matches(remote, body, metadata):
    return (remote is not None and remote.get("ContentLength") == len(body)
            and all(remote.get("Metadata", {}).get(k) == v for k, v in metadata.items()))


def process_one(id, url, cfg, store, *, downloader=download_image):
    if is_placeholder_source(url):
        return {"object_key": None, "new_url": None}
    key = f"vinnot-{uuid.UUID(id)}.webp"
    body = convert_image(downloader(url), cfg.quality)
    if hashlib.sha256(body).hexdigest() == PLACEHOLDER_SHA256:
        raise ValueError("Known placeholder bytes require a missing-image mapping")
    metadata = {"sha256": hashlib.sha256(body).hexdigest(),
                "source-sha256": hashlib.sha256(url.encode()).hexdigest(),
                "config-sha256": cfg.scope()}
    # Recompute expected bytes on retry. This covers PUT success followed by a
    # crash before SQLite commit, without trusting an ETag or stale URL alone.
    if not matches(head(store, cfg, key), body, metadata):
        store.put_object(Bucket=cfg.bucket, Key=key, Body=body,
                         ContentType="image/webp", Metadata=metadata)
    if not matches(head(store, cfg, key), body, metadata):
        raise ValueError("Object verification failed")
    return {"object_key": key, "new_url": cfg.public_base + "/" + key}


def migrate(dsn, cfg, state, store, *, limit: int | None = 100, batch_size=500, threads=3,
            max_attempts=3, fetch=fetch_batch, process=process_one, sleep=time.sleep, progress=None):
    if batch_size < 1 or threads < 1 or max_attempts < 1 or (limit is not None and limit < 1):
        raise ValueError("Run limits must be positive")
    selected = 0
    failures = 0
    after = None
    with ThreadPoolExecutor(max_workers=threads) as executor:
        while limit is None or selected < limit:
            size = batch_size if limit is None else min(batch_size, limit - selected)
            rows = fetch(dsn, after, size)
            if not rows:
                break
            selected += len(rows)
            after = rows[-1][0]
            pending = [row for row in rows if state.prepare(*row)]
            queue = deque(row for row in pending if state.attempts(row[0]) < max_attempts)
            futures = {}
            def attempt(id, url, count):
                if count > 1:
                    sleep(2 ** min(count - 2, 3))
                return process(id, url, cfg, store)
            # Keep at most `threads` submitted futures. A slow download no longer
            # stalls unrelated completed workers; SQLite stays on the main thread.
            while queue or futures:
                while queue and len(futures) < threads:
                    id, url = queue.popleft()
                    state.begin_attempt(id)  # Durable before dispatch.
                    futures[executor.submit(attempt, id, url, state.attempts(id))] = (id, url)
                completed, _ = wait(futures, return_when=FIRST_COMPLETED)
                for future in completed:
                    id, url = futures.pop(future)
                    try:
                        result = future.result()
                    except Exception as error:
                        state.fail(id, error)
                        if state.attempts(id) < max_attempts:
                            queue.append((id, url))
                    else:
                        state.succeed(id, result)
            failures += sum(state.connection.execute(
                "SELECT status FROM items WHERE id=?", (id,)).fetchone()[0] != "success"
                for id, _ in pending)
            if progress:
                progress({"selected": selected, "failed": failures})
    return {"selected": selected, "failed": failures}
