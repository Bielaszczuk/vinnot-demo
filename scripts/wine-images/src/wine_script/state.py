"""Single-thread SQLite progress and atomic, credential-free CSV export."""

import csv
import os
import sqlite3
import tempfile
from pathlib import Path

from .placeholders import without_placeholder


class State:
    def __init__(self, path, scope=None):
        path = Path(path)
        self.readonly = scope is None
        if self.readonly:
            self.connection = sqlite3.connect(path.resolve().as_uri() + "?mode=ro", uri=True)
            return
        self.connection = sqlite3.connect(path)
        try:
            self.connection.execute("PRAGMA journal_mode=WAL")
            self.connection.execute("PRAGMA synchronous=FULL")
            with self.connection:
                self.connection.execute("CREATE TABLE IF NOT EXISTS config (scope TEXT NOT NULL)")
                existing = self.connection.execute("SELECT scope FROM config").fetchone()
                if existing and existing[0] != scope:
                    raise ValueError("State configuration differs; choose a new --state file")
                if not existing:
                    self.connection.execute("INSERT INTO config VALUES (?)", (scope,))
                self.connection.execute("""CREATE TABLE IF NOT EXISTS items (
                    id TEXT PRIMARY KEY, original_url TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
                    error TEXT, new_url TEXT, object_key TEXT, verified INTEGER NOT NULL DEFAULT 0
                )""")
                self.connection.execute("""CREATE TABLE IF NOT EXISTS failures (
                    id TEXT NOT NULL, original_url TEXT NOT NULL, attempt INTEGER NOT NULL,
                    error TEXT NOT NULL, occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )""")
        except BaseException:
            self.connection.close()
            raise

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.connection.close()

    def prepare(self, id, url):
        with self.connection:
            self.connection.execute("""INSERT INTO items(id, original_url) VALUES (?, ?)
                ON CONFLICT(id) DO UPDATE SET original_url=excluded.original_url,
                status='pending', attempts=0, error=NULL, new_url=NULL, object_key=NULL, verified=0
                WHERE items.original_url != excluded.original_url""", (id, url))
        return self.connection.execute("SELECT status FROM items WHERE id=?", (id,)).fetchone()[0] != "success"

    def attempts(self, id):
        return self.connection.execute("SELECT attempts FROM items WHERE id=?", (id,)).fetchone()[0]

    def begin_attempt(self, id):
        with self.connection:
            self.connection.execute("UPDATE items SET attempts=attempts+1, status='pending' WHERE id=?", (id,))

    def fail(self, id, exception):
        # Persist the class, never exception text (HTTP/SDK errors may contain credentials).
        error = type(exception).__name__
        with self.connection:
            self.connection.execute("UPDATE items SET status='failed', error=? WHERE id=?", (error, id))
            self.connection.execute("""INSERT INTO failures(id, original_url, attempt, error)
                SELECT id, original_url, attempts, ? FROM items WHERE id=?""", (error, id))

    def succeed(self, id, result):
        source = self.connection.execute("SELECT original_url FROM items WHERE id=?", (id,)).fetchone()[0]
        result = without_placeholder({**result, "original_url": source})
        with self.connection:
            self.connection.execute("""UPDATE items SET status='success', verified=1,
                error=NULL, new_url=?, object_key=? WHERE id=?""",
                (result["new_url"], result["object_key"], id))

    def retry_failed(self):
        with self.connection:
            self.connection.execute("UPDATE items SET attempts=0 WHERE status != 'success'")

    def export(self, path):
        path = Path(path)
        # A failed export may leave a .tmp file, but never a partially replaced CSV.
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", newline="",
                                         dir=path.parent, prefix=path.name + ".", suffix=".tmp",
                                         delete=False) as file:
            writer = csv.writer(file)
            writer.writerow(["id", "original_url", "new_url", "object_key"])
            columns = ("id", "original_url", "new_url", "object_key")
            for values in self.connection.execute("""SELECT id, original_url, new_url, object_key
                    FROM items WHERE status='success' AND verified=1 ORDER BY id"""):
                # Also sanitize exports from old read-only progress files.
                row = without_placeholder(dict(zip(columns, values, strict=True)))
                writer.writerow([row[column] for column in columns])
            file.flush()
            os.fsync(file.fileno())
            temporary = file.name
        os.replace(temporary, path)
