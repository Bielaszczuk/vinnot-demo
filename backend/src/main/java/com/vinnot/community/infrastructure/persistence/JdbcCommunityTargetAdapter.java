package com.vinnot.community.infrastructure.persistence;
import com.vinnot.community.application.port.out.CommunityTargetPort;
import com.vinnot.community.domain.model.ContentTarget;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import java.sql.PreparedStatement;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
@Component
@RequiredArgsConstructor
public class JdbcCommunityTargetAdapter implements CommunityTargetPort {
    /** One statement per moderation page; rows that no longer exist simply do not come back. */
    private static final String NAMES =
            """
            SELECT 'REVIEW' AS kind,r.id,w.name AS label FROM reviews r JOIN wines w ON w.id=r.wine_id
             WHERE r.id = ANY(?)
            UNION ALL SELECT 'COMMENT',c.id,w.name FROM review_comments c JOIN reviews r ON r.id=c.review_id
             JOIN wines w ON w.id=r.wine_id WHERE c.id = ANY(?)
            UNION ALL SELECT 'EVENT',id,title FROM events WHERE id = ANY(?)
            UNION ALL SELECT 'WINE_ROUTE',id,name FROM wine_routes WHERE id = ANY(?)
            UNION ALL SELECT 'USER',id,username FROM users WHERE id = ANY(?)
            """;
    /** Bind order of the {@link #NAMES} arrays. */
    private static final List<ContentTarget.Type> NAME_ORDER =
            List.of(
                    ContentTarget.Type.REVIEW,
                    ContentTarget.Type.COMMENT,
                    ContentTarget.Type.EVENT,
                    ContentTarget.Type.WINE_ROUTE,
                    ContentTarget.Type.USER);
    private final JdbcTemplate jdbc;
    @Override
    public Optional<TargetDetails> findPublic(ContentTarget target) {
        String sql = switch (target.type()) {
            case USER ->
                    "SELECT id AS author_id,username AS excerpt FROM users WHERE id=? AND"
                        + " active=true";
            case REVIEW ->
                    "SELECT r.user_id AS author_id,concat_ws(' ',r.title,r.comment) AS"
                        + " excerpt FROM reviews r JOIN wines w ON w.id=r.wine_id WHERE"
                        + " r.id=? AND r.publication_status='APPROVED' AND w.is_active=true";
            case COMMENT ->
                    "SELECT c.user_id AS author_id,c.content AS excerpt FROM"
                        + " review_comments c JOIN reviews r ON r.id=c.review_id JOIN wines"
                        + " w ON w.id=r.wine_id WHERE c.id=? AND c.publication_status='APPROVED' AND r.publication_status='APPROVED' AND w.is_active=true";
            case EVENT ->
                    "SELECT organizer_id AS author_id,concat_ws(' ',title,description) AS"
                        + " excerpt FROM events WHERE id=? AND status<>'DRAFT' AND"
                        + " published_once=true";
            case WINE_ROUTE ->
                    "SELECT created_by AS author_id,concat_ws(' ',name,description) AS"
                        + " excerpt FROM wine_routes WHERE id=? AND status='PUBLISHED'";
        };
        return jdbc
                .query(
                        sql,
                        (r, row) ->
                                new TargetDetails(
                                        r.getObject("author_id", UUID.class),
                                        r.getString("excerpt")),
                        target.id())
                .stream()
                .findFirst();
    }

    @Override
    public ModerationNames describe(Set<ContentTarget> targets, Set<UUID> users) {
        Map<ContentTarget.Type, Set<UUID>> ids = new EnumMap<>(ContentTarget.Type.class);
        for (ContentTarget.Type type : ContentTarget.Type.values()) {
            ids.put(type, new HashSet<>());
        }
        targets.forEach(target -> ids.get(target.type()).add(target.id()));
        ids.get(ContentTarget.Type.USER).addAll(users);
        Map<ContentTarget, String> labels = new HashMap<>();
        Map<UUID, String> usernames = new HashMap<>();
        if (ids.values().stream().allMatch(Set::isEmpty)) {
            return new ModerationNames(labels, usernames);
        }
        jdbc.query(
                connection -> {
                    PreparedStatement statement = connection.prepareStatement(NAMES);
                    int parameter = 0;
                    for (ContentTarget.Type type : NAME_ORDER) {
                        statement.setArray(
                                ++parameter,
                                connection.createArrayOf("uuid", ids.get(type).toArray()));
                    }
                    return statement;
                },
                row -> {
                    String label = row.getString("label");
                    if (Objects.isNull(label)) {
                        return;
                    }
                    var target =
                            new ContentTarget(
                                    ContentTarget.Type.valueOf(row.getString("kind")),
                                    row.getObject("id", UUID.class));
                    if (target.type() == ContentTarget.Type.USER) {
                        usernames.put(target.id(), label);
                    }
                    if (targets.contains(target)) {
                        labels.put(target, label);
                    }
                });
        return new ModerationNames(labels, usernames);
    }
}
