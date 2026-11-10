package com.vinnot.shared.infrastructure.persistence;

import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.regex.Pattern;

/**
 * A one-row "covered until" cursor that a periodic job advances to claim the next time window to report. The row is
 * locked with FOR UPDATE for the caller's transaction and never moves back, so a run with an earlier clock that waited
 * for the lock gets an empty window instead of reporting a period twice.
 *
 * @param table     the cursor table, a fixed identifier chosen by the adapter (never user input)
 * @param keyColumn the column that selects the cursor row in that table
 */
public record CoverageCursor(String table, String keyColumn) {
    private static final Pattern IDENTIFIER = Pattern.compile("[a-z_]+");

    public CoverageCursor {
        if (!IDENTIFIER.matcher(table).matches() || !IDENTIFIER.matcher(keyColumn).matches()) {
            throw new IllegalArgumentException("Cursor table and key column must be plain identifiers");
        }
    }

    /** The claimed window: everything after {@code from} and up to {@code to}. */
    public record Window(Instant from, Instant to) { }

    /** Locks the row selected by {@code key} and moves it to {@code until}, unless it already covers a later time. */
    public Window claim(JdbcTemplate jdbc, Object key, Instant until) {
        Instant from = jdbc.queryForObject("SELECT covered_until FROM " + table + " WHERE " + keyColumn + " = ? FOR UPDATE",
                Timestamp.class, key).toInstant();
        Instant to = until.isAfter(from) ? until : from;
        jdbc.update("UPDATE " + table + " SET covered_until = ? WHERE " + keyColumn + " = ?", Timestamp.from(to), key);
        return new Window(from, to);
    }
}
