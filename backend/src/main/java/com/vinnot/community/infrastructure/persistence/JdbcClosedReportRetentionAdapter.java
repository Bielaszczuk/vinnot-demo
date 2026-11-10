package com.vinnot.community.infrastructure.persistence;

import com.vinnot.community.application.port.out.ClosedReportRetentionPort;

import lombok.RequiredArgsConstructor;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;

@Repository
@RequiredArgsConstructor
public class JdbcClosedReportRetentionAdapter implements ClosedReportRetentionPort {
    private final JdbcTemplate jdbc;

    @Override
    public int deleteClosedBefore(Instant cutoff, int limit) {
        int reports =
                jdbc.update(
                        """
                        DELETE FROM community_reports WHERE id IN (
                            SELECT id FROM community_reports
                            WHERE status IN ('RESOLVED','DISMISSED') AND updated_at <= ?
                            ORDER BY updated_at,id LIMIT ? FOR UPDATE SKIP LOCKED
                        )
                        """,
                        Timestamp.from(cutoff),
                        limit);
        return reports
                + jdbc.update(
                        """
                        DELETE FROM review_publication_decisions WHERE id IN (
                            SELECT id FROM review_publication_decisions WHERE created_at <= ?
                            ORDER BY created_at,id LIMIT ? FOR UPDATE SKIP LOCKED
                        )
                        """,
                        Timestamp.from(cutoff),
                        limit);
    }
}
