package com.vinnot.review.infrastructure.persistence.adapter;

import com.vinnot.review.application.port.out.ReviewPublicationRepositoryPort;
import com.vinnot.review.domain.model.PublicationStatus;
import com.vinnot.review.domain.model.ReviewPublication;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;

import lombok.RequiredArgsConstructor;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class JdbcReviewPublicationAdapter implements ReviewPublicationRepositoryPort {
    private static final String REVIEW =
            """
            SELECT 'REVIEW' AS target_type,r.id,r.wine_id,r.id AS review_id,r.user_id AS author_id,
            r.rating,COALESCE(r.title,'') AS title,COALESCE(r.comment,'') AS content,
            r.publication_status,r.created_at,r.updated_at,true AS parent_approved FROM reviews r
            """;
    private static final String COMMENT =
            """
            SELECT 'COMMENT' AS target_type,c.id,r.wine_id,c.review_id,c.user_id AS author_id,
            NULL::numeric AS rating,'' AS title,c.content,c.publication_status,c.created_at,c.updated_at,
            r.publication_status='APPROVED' AS parent_approved FROM review_comments c JOIN reviews r ON r.id=c.review_id
            """;
    private static final String QUEUE =
            REVIEW
                    + " WHERE r.publication_status='PENDING' AND r.user_id<>? UNION ALL "
                    + COMMENT
                    + " WHERE c.publication_status='PENDING' AND c.user_id<>? AND"
                    + " r.publication_status='APPROVED'";
    /** One statement per queue page; deleted users and wines simply do not come back. */
    private static final String NAMES =
            "SELECT 'AUTHOR' AS kind,id,username AS name FROM users WHERE id = ANY(?) UNION ALL"
                    + " SELECT 'WINE',id,name FROM wines WHERE id = ANY(?)";
    private final JdbcTemplate jdbc;

    @Override
    public Optional<UUID> findWineId(ReviewPublication.Type type, UUID id) {
        String sql =
                type == ReviewPublication.Type.REVIEW
                        ? "SELECT wine_id FROM reviews WHERE id=?"
                        : "SELECT r.wine_id FROM review_comments c JOIN reviews r ON"
                                + " r.id=c.review_id WHERE c.id=?";
        return jdbc.query(sql, (r, row) -> r.getObject("wine_id", UUID.class), id).stream()
                .findFirst();
    }

    @Override
    public Optional<ReviewPublication> findForUpdate(ReviewPublication.Type type, UUID id) {
        String sql =
                type == ReviewPublication.Type.REVIEW
                        ? REVIEW + " WHERE r.id=? FOR UPDATE OF r"
                        : COMMENT + " WHERE c.id=? FOR UPDATE OF c";
        return jdbc.query(sql, this::read, id).stream().findFirst();
    }

    @Override
    public PageResult<ReviewPublication> pending(UUID reviewerId, PageQuery page) {
        long count =
                jdbc.queryForObject(
                        "SELECT COUNT(*) FROM (" + QUEUE + ") q",
                        Long.class,
                        reviewerId,
                        reviewerId);
        List<ReviewPublication> content =
                jdbc.query(
                        "SELECT * FROM (" + QUEUE + ") q ORDER BY created_at,id LIMIT ? OFFSET ?",
                        this::read,
                        reviewerId,
                        reviewerId,
                        page.size(),
                        (long) page.page() * page.size());
        return PageResult.of(content, page.page(), page.size(), count);
    }

    @Override
    public PublicationNames findNames(Set<UUID> authorIds, Set<UUID> wineIds) {
        Map<UUID, String> authors = new HashMap<>();
        Map<UUID, String> wines = new HashMap<>();
        if (authorIds.isEmpty() && wineIds.isEmpty()) {
            return new PublicationNames(authors, wines);
        }
        jdbc.query(
                connection -> {
                    PreparedStatement statement = connection.prepareStatement(NAMES);
                    statement.setArray(1, connection.createArrayOf("uuid", authorIds.toArray()));
                    statement.setArray(2, connection.createArrayOf("uuid", wineIds.toArray()));
                    return statement;
                },
                row -> {
                    String name = row.getString("name");
                    if (Objects.isNull(name)) {
                        return;
                    }
                    UUID id = row.getObject("id", UUID.class);
                    if ("AUTHOR".equals(row.getString("kind"))) {
                        authors.put(id, name);
                    } else {
                        wines.put(id, name);
                    }
                });
        return new PublicationNames(authors, wines);
    }

    @Override
    public void decide(
            ReviewPublication content,
            UUID reviewer,
            PublicationStatus decision,
            ReviewPublication.Decision checked,
            Instant now) {
        String table =
                content.type() == ReviewPublication.Type.REVIEW ? "reviews" : "review_comments";
        jdbc.update(
                "UPDATE " + table + " SET publication_status=? WHERE id=?",
                decision.name(),
                content.id());
        jdbc.update(
                "INSERT INTO"
                    + " review_publication_decisions(target_type,target_id,reviewer_id,status,reason,reason_code,"
                    + "content_revision,created_at) VALUES (?,?,?,?,?,?,?,?)",
                content.type().name(),
                content.id(),
                reviewer,
                decision.name(),
                checked.note(),
                Objects.isNull(checked.reasonCode()) ? null : checked.reasonCode().name(),
                Timestamp.from(content.updatedAt()),
                Timestamp.from(now));
    }

    private ReviewPublication read(ResultSet r, int row) throws SQLException {
        return new ReviewPublication(
                ReviewPublication.Type.valueOf(r.getString("target_type")),
                r.getObject("id", UUID.class),
                r.getObject("wine_id", UUID.class),
                r.getObject("review_id", UUID.class),
                r.getObject("author_id", UUID.class),
                r.getBigDecimal("rating"),
                r.getString("title"),
                r.getString("content"),
                PublicationStatus.valueOf(r.getString("publication_status")),
                r.getTimestamp("created_at").toInstant(),
                r.getTimestamp("updated_at").toInstant(),
                r.getBoolean("parent_approved"));
    }
}
