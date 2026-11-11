package com.vinnot.community.infrastructure.persistence;

import com.vinnot.community.application.port.out.CommunityReportRepositoryPort;
import com.vinnot.community.domain.model.CommunityReport;
import com.vinnot.community.domain.model.ContentTarget;
import com.vinnot.community.domain.model.ReportCounts;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;

import lombok.RequiredArgsConstructor;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.ArrayList;

@Repository
@RequiredArgsConstructor
public class JdbcCommunityReportAdapter implements CommunityReportRepositoryPort {
    private static final String MODERATION_SCOPE =
            "reporter_id IS DISTINCT FROM ? AND author_id IS DISTINCT FROM ?";
    private static final String INSERT =
            """
            INSERT INTO community_reports(id,reporter_id,target_type,target_id,author_id,reason,description,excerpt,status,
              reviewer_id,decision,created_at,updated_at,related_target_id)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """;
    private final JdbcTemplate jdbc;

    @Override
    public ReportCounts countMine(UUID reporter) {
        return counts("reporter_id=?", reporter);
    }

    @Override
    public ReportCounts countForModeration(UUID moderator) {
        return counts(MODERATION_SCOPE, moderator, moderator);
    }

    private ReportCounts counts(String predicate, Object... args) {
        return jdbc.queryForObject(
                """
                SELECT count(*) FILTER (WHERE status='OPEN') AS open_count,
                       count(*) FILTER (WHERE status='IN_REVIEW') AS review_count,
                       count(*) FILTER (WHERE status='RESOLVED') AS resolved_count,
                       count(*) FILTER (WHERE status='DISMISSED') AS dismissed_count
                FROM community_reports WHERE
                """
                        + predicate,
                (r, row) ->
                        new ReportCounts(
                                r.getLong("open_count"),
                                r.getLong("review_count"),
                                r.getLong("resolved_count"),
                                r.getLong("dismissed_count")),
                args);
    }

    @Override
    public void lockReporter(UUID reporter) {
        if (jdbc.queryForList(
                        "SELECT id FROM users WHERE id=? AND active=true AND locked=false FOR"
                                + " UPDATE",
                        UUID.class,
                        reporter)
                .isEmpty()) {
            throw new EntityNotFoundException("User", reporter);
        }
    }

    @Override
    public Optional<CommunityReport> findOpen(UUID reporter, ContentTarget target) {
        return jdbc
                .query(
                        "SELECT * FROM community_reports WHERE reporter_id=? AND target_type=? AND"
                                + " target_id=? AND status IN ('OPEN','IN_REVIEW')",
                        this::read,
                        reporter,
                        target.type().name(),
                        target.id())
                .stream()
                .findFirst();
    }

    @Override
    public long countSince(UUID reporter, Instant since) {
        return jdbc.queryForObject(
                "SELECT count(*) FROM community_reports WHERE reporter_id=? AND created_at>=?",
                Long.class,
                reporter,
                Timestamp.from(since));
    }

    @Override
    public CommunityReport save(CommunityReport r) {
        jdbc.update(
                INSERT
                        + """
                ON CONFLICT(id) DO UPDATE SET status=EXCLUDED.status,reviewer_id=EXCLUDED.reviewer_id,
                  decision=EXCLUDED.decision,updated_at=EXCLUDED.updated_at
                """,
                columns(r));
        recordAction(r);
        return r;
    }

    @Override
    public boolean hasOpenCatalogReport(UUID wineId, UUID otherWineId) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                """
                SELECT EXISTS (SELECT 1 FROM community_reports WHERE reason='CATALOG_QUALITY'
                  AND status IN ('OPEN','IN_REVIEW')
                  AND LEAST(target_id,related_target_id)=LEAST(?::uuid,?::uuid)
                  AND GREATEST(target_id,related_target_id)=GREATEST(?::uuid,?::uuid))
                """,
                Boolean.class,
                wineId,
                otherWineId,
                wineId,
                otherWineId));
    }

    @Override
    public boolean insertIfAbsent(CommunityReport r) {
        if (jdbc.update(INSERT + " ON CONFLICT DO NOTHING", columns(r)) == 0) {
            return false;
        }
        recordAction(r);
        return true;
    }

    private static Object[] columns(CommunityReport r) {
        return new Object[] {
                r.id(),
                r.reporterId(),
                r.target().type().name(),
                r.target().id(),
                r.authorId(),
                r.reason().name(),
                r.description(),
                r.excerpt(),
                r.status().name(),
                r.reviewerId(),
                r.decision(),
                Timestamp.from(r.createdAt()),
                Timestamp.from(r.updatedAt()),
                r.relatedTargetId()
        };
    }

    private void recordAction(CommunityReport r) {
        jdbc.update(
                "INSERT INTO"
                    + " community_report_actions(report_id,reviewer_id,status,decision,created_at)"
                    + " VALUES (?,?,?,?,?)",
                r.id(),
                r.reviewerId(),
                r.status().name(),
                r.decision(),
                Timestamp.from(r.updatedAt()));
    }

    @Override
    public Optional<CommunityReport> findForUpdate(UUID id) {
        return jdbc
                .query("SELECT * FROM community_reports WHERE id=? FOR UPDATE", this::read, id)
                .stream()
                .findFirst();
    }

    @Override
    public PageResult<CommunityReport> findMine(UUID reporter, PageQuery page) {
        return page("reporter_id=?", List.of(reporter), page);
    }

    @Override
    public PageResult<CommunityReport> findForModeration(
            UUID moderator, CommunityReport.Status status, PageQuery page) {
        return page(
                MODERATION_SCOPE + " AND status=?",
                List.of(moderator, moderator, status.name()),
                page);
    }

    private PageResult<CommunityReport> page(String predicate, List<Object> args, PageQuery page) {
        Long total =
                jdbc.queryForObject(
                        "SELECT count(*) FROM community_reports WHERE " + predicate,
                        Long.class,
                        args.toArray());
        var parameters = new ArrayList<>(args);
        parameters.add(page.size());
        parameters.add((long) page.page() * page.size());
        var rows =
                jdbc.query(
                        "SELECT * FROM community_reports WHERE "
                                + predicate
                                + " ORDER BY created_at,id LIMIT ? OFFSET ?",
                        this::read,
                        parameters.toArray());
        return PageResult.of(rows, page.page(), page.size(), total);
    }

    private CommunityReport read(ResultSet r, int row) throws SQLException {
        return new CommunityReport(
                r.getObject("id", UUID.class),
                r.getObject("reporter_id", UUID.class),
                new ContentTarget(
                        ContentTarget.Type.valueOf(r.getString("target_type")),
                        r.getObject("target_id", UUID.class)),
                r.getObject("author_id", UUID.class),
                CommunityReport.Reason.valueOf(r.getString("reason")),
                r.getString("description"),
                r.getString("excerpt"),
                CommunityReport.Status.valueOf(r.getString("status")),
                r.getObject("reviewer_id", UUID.class),
                r.getString("decision"),
                r.getTimestamp("created_at").toInstant(),
                r.getTimestamp("updated_at").toInstant(),
                r.getObject("related_target_id", UUID.class));
    }
}
