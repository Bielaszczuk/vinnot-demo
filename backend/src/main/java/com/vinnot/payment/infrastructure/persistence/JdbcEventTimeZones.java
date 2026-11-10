package com.vinnot.payment.infrastructure.persistence;

import com.vinnot.payment.application.port.out.EventTimeZones;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.UUID;

/** Reads {@code events.timezone} (NOT NULL since V40); a missing event falls back to UTC, which emails label. */
public class JdbcEventTimeZones implements EventTimeZones {
    static final String FALLBACK = "UTC";
    private final JdbcTemplate jdbc;

    public JdbcEventTimeZones(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public String of(UUID eventId) {
        return jdbc.query("SELECT timezone FROM events WHERE id = ?", (row, index) -> row.getString(1), eventId)
                .stream().findFirst().orElse(FALLBACK);
    }
}
