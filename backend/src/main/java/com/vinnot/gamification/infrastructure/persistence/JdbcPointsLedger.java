package com.vinnot.gamification.infrastructure.persistence;

import com.vinnot.gamification.application.port.out.PointsLedgerPort;
import com.vinnot.gamification.domain.model.DailyEarnings;
import com.vinnot.gamification.domain.model.PointAward;
import com.vinnot.gamification.domain.model.PointMovement;
import com.vinnot.gamification.domain.model.PointSource;
import com.vinnot.gamification.domain.model.PointSubject;
import com.vinnot.gamification.domain.model.PointsAccount;
import com.vinnot.gamification.domain.model.Tier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * {@code user_points}, {@code user_point_awards} and {@code user_point_movements} (V70). The members row is read
 * {@code FOR KEY SHARE} before the points row is locked, in the same order an account deletion takes them, so an
 * award and a deletion of the same member never deadlock.
 */
@Component
public class JdbcPointsLedger implements PointsLedgerPort {
    private static final String ACCOUNT_COLUMNS = """
            SELECT u.id, u.timezone, COALESCE(p.points, 0) AS points,
                   COALESCE(p.highest_tier_reached, 'BROTE') AS highest_reached,
                   COALESCE(p.highest_tier_celebrated, 'BROTE') AS highest_celebrated,
                   COALESCE(p.welcome_seen, true) AS welcome_seen
            FROM users u LEFT JOIN user_points p ON p.user_id = u.id WHERE u.id = ?
            """;
    private static final String AWARD_COLUMNS =
            "SELECT user_id, source, source_key, points, subject_type, subject_id, active, awarded_at FROM user_point_awards ";

    /** The zone every member had before choosing one (V39). */
    private static final ZoneId DEFAULT_ZONE = ZoneId.of("America/Argentina/Buenos_Aires");

    private final JdbcTemplate jdbc;

    public JdbcPointsLedger(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Optional<PointsAccount> lockAccount(UUID userId) {
        if (jdbc.queryForList("SELECT id FROM users WHERE id = ? FOR KEY SHARE", UUID.class, userId).isEmpty()) {
            return Optional.empty();
        }
        jdbc.update("INSERT INTO user_points(user_id) VALUES (?) ON CONFLICT (user_id) DO NOTHING", userId);
        jdbc.queryForList("SELECT user_id FROM user_points WHERE user_id = ? FOR UPDATE", UUID.class, userId);
        return findAccount(userId);
    }

    @Override
    public Optional<PointsAccount> findAccount(UUID userId) {
        return jdbc.query(ACCOUNT_COLUMNS, (row, index) -> new PointsAccount(
                row.getObject("id", UUID.class),
                zone(row.getString("timezone")),
                row.getInt("points"),
                Tier.valueOf(row.getString("highest_reached")),
                Tier.valueOf(row.getString("highest_celebrated")),
                row.getBoolean("welcome_seen")), userId).stream().findFirst();
    }

    @Override
    public void saveAccount(PointsAccount account) {
        jdbc.update("""
                UPDATE user_points SET points = ?, current_tier = ?, highest_tier_reached = ?, highest_tier_celebrated = ?,
                    welcome_seen = ?, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
                """, account.points(), account.tier().name(), account.highestReached().name(),
                account.highestCelebrated().name(), account.welcomeSeen(), account.userId());
    }

    @Override
    public Optional<PointAward> findAward(UUID userId, PointSource source, String sourceKey) {
        return jdbc.query(AWARD_COLUMNS + "WHERE user_id = ? AND source = ? AND source_key = ?",
                (row, index) -> award(row), userId, source.name(), sourceKey).stream().findFirst();
    }

    @Override
    public List<PointAward> findActiveAwards(UUID userId, PointSource source, String keyPrefix) {
        return jdbc.query(AWARD_COLUMNS + "WHERE user_id = ? AND source = ? AND active AND left(source_key, ?) = ? ORDER BY source_key",
                (row, index) -> award(row), userId, source.name(), keyPrefix.length(), keyPrefix);
    }

    @Override
    public void saveAward(PointAward award, Instant at) {
        Timestamp when = Timestamp.from(at);
        PointSubject subject = award.subject();
        jdbc.update("""
                INSERT INTO user_point_awards(user_id, source, source_key, points, subject_type, subject_id, active, awarded_at, revoked_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (user_id, source, source_key) DO UPDATE SET points = EXCLUDED.points,
                    subject_type = EXCLUDED.subject_type, subject_id = EXCLUDED.subject_id, active = EXCLUDED.active,
                    awarded_at = EXCLUDED.awarded_at, revoked_at = EXCLUDED.revoked_at
                """, award.userId(), award.source().name(), award.sourceKey(), award.points(),
                Objects.isNull(subject) ? null : subject.kind().name(), Objects.isNull(subject) ? null : subject.id(),
                award.active(), Timestamp.from(award.awardedAt()), award.active() ? null : when);
    }

    @Override
    public void recordMovement(PointMovement movement) {
        PointSubject subject = movement.subject();
        jdbc.update("""
                INSERT INTO user_point_movements(id, user_id, source, source_key, points, subject_type, subject_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, movement.id(), movement.userId(), movement.source().name(), movement.sourceKey(), movement.points(),
                Objects.isNull(subject) ? null : subject.kind().name(), Objects.isNull(subject) ? null : subject.id(),
                Timestamp.from(movement.createdAt()));
    }

    @Override
    public DailyEarnings earnedSince(UUID userId, PointSource source, Instant since) {
        return jdbc.queryForObject("""
                SELECT COALESCE(SUM(points) FILTER (WHERE source = ?), 0) AS from_source,
                       COALESCE(SUM(points) FILTER (WHERE source <> ?), 0) AS within_cap
                FROM user_point_movements WHERE user_id = ? AND points > 0 AND created_at >= ?
                """, (row, index) -> new DailyEarnings(row.getInt("from_source"), row.getInt("within_cap")),
                source.name(), PointSource.WINE_APPROVED.name(), userId, Timestamp.from(since));
    }

    @Override
    public List<PointMovement> recentMovements(UUID userId, int limit) {
        return jdbc.query("""
                SELECT m.id, m.user_id, m.source, m.source_key, m.points, m.subject_type, m.subject_id, m.created_at,
                       CASE m.subject_type WHEN 'WINE' THEN w.name WHEN 'EVENT' THEN e.title END AS label
                FROM user_point_movements m
                LEFT JOIN wines w ON m.subject_type = 'WINE' AND w.id = m.subject_id
                LEFT JOIN events e ON m.subject_type = 'EVENT' AND e.id = m.subject_id
                WHERE m.user_id = ? ORDER BY m.created_at DESC, m.id LIMIT ?
                """, (row, index) -> new PointMovement(
                row.getObject("id", UUID.class),
                row.getObject("user_id", UUID.class),
                PointSource.valueOf(row.getString("source")),
                row.getString("source_key"),
                row.getInt("points"),
                subject(row),
                row.getTimestamp("created_at").toInstant(),
                row.getString("label")), userId, limit);
    }

    @Override
    public List<MemberPoints> pointsOf(Collection<UUID> userIds) {
        return jdbc.query("""
                SELECT u.id, COALESCE(p.points, 0) AS points, (u.active AND NOT u.locked) AS visible
                FROM users u LEFT JOIN user_points p ON p.user_id = u.id WHERE u.id = ANY (?)
                """, (row, index) -> new MemberPoints(row.getObject("id", UUID.class), row.getInt("points"),
                row.getBoolean("visible")), (Object) userIds.toArray(UUID[]::new));
    }

    private static PointAward award(ResultSet row) throws SQLException {
        return new PointAward(
                row.getObject("user_id", UUID.class),
                PointSource.valueOf(row.getString("source")),
                row.getString("source_key"),
                subject(row),
                row.getInt("points"),
                row.getBoolean("active"),
                row.getTimestamp("awarded_at").toInstant());
    }

    private static PointSubject subject(ResultSet row) throws SQLException {
        String kind = row.getString("subject_type");
        return Objects.isNull(kind) ? null : new PointSubject(PointSubject.Kind.valueOf(kind), row.getObject("subject_id", UUID.class));
    }

    private static ZoneId zone(String value) {
        try {
            return ZoneId.of(value);
        } catch (RuntimeException invalid) {
            return DEFAULT_ZONE;
        }
    }
}
