package com.vinnot.shared.infrastructure.persistence;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Timestamp;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CoverageCursorTest {
    private static final String SELECT = "SELECT covered_until FROM report_cursor WHERE id = ? FOR UPDATE";
    private static final String UPDATE = "UPDATE report_cursor SET covered_until = ? WHERE id = ?";
    private static final Instant COVERED = Instant.parse("2026-10-20T10:00:00Z");
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final CoverageCursor cursor = new CoverageCursor("report_cursor", "id");

    @Test
    void claimsFromTheCoveredTimeUpToNowAndMovesTheCursor() {
        when(jdbc.queryForObject(eq(SELECT), eq(Timestamp.class), eq(1))).thenReturn(Timestamp.from(COVERED));
        Instant now = COVERED.plusSeconds(60);

        assertThat(cursor.claim(jdbc, 1, now)).isEqualTo(new CoverageCursor.Window(COVERED, now));
        verify(jdbc).update(UPDATE, Timestamp.from(now), 1);
    }

    @Test
    void neverMovesBackForAnEarlierClock() {
        when(jdbc.queryForObject(eq(SELECT), eq(Timestamp.class), eq(1))).thenReturn(Timestamp.from(COVERED));

        assertThat(cursor.claim(jdbc, 1, COVERED.minusSeconds(60))).isEqualTo(new CoverageCursor.Window(COVERED, COVERED));
        verify(jdbc).update(UPDATE, Timestamp.from(COVERED), 1);
    }

    @Test
    void acceptsOnlyPlainIdentifiers() {
        assertThatThrownBy(() -> new CoverageCursor("cursor; DROP TABLE users", "id")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new CoverageCursor("cursor", "id = 1 OR 1")).isInstanceOf(IllegalArgumentException.class);
    }
}
