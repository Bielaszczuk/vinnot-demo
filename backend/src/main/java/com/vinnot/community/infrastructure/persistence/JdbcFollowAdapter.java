package com.vinnot.community.infrastructure.persistence;

import com.vinnot.community.application.port.out.FollowRepositoryPort;

import lombok.RequiredArgsConstructor;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class JdbcFollowAdapter implements FollowRepositoryPort {
    /** First key of the pair lock, distinct from every other advisory lock of the application. */
    static final int PAIR_LOCK_NAMESPACE = 541_001;
    private final JdbcTemplate jdbc;

    @Override
    public void lockPair(UUID first, UUID second) {
        String low = first.compareTo(second) <= 0 ? first.toString() : second.toString();
        String high = first.compareTo(second) <= 0 ? second.toString() : first.toString();
        jdbc.query("SELECT pg_advisory_xact_lock(?, hashtext(? || ':' || ?))", row -> { }, PAIR_LOCK_NAMESPACE, low, high);
    }

    @Override
    public Optional<Member> findActiveMember(UUID userId) {
        return jdbc.query(
                "SELECT id,username,first_name,last_name FROM users WHERE id=? AND active",
                (row, index) -> new Member(row.getObject("id", UUID.class), row.getString("username"),
                        row.getString("first_name"), row.getString("last_name")),
                userId).stream().findFirst();
    }

    @Override
    public boolean follow(UUID follower, UUID followee) {
        return jdbc.update(
                "INSERT INTO user_follows(follower_id,followee_id) VALUES (?,?) ON CONFLICT DO NOTHING",
                follower, followee) > 0;
    }

    @Override
    public boolean unfollow(UUID follower, UUID followee) {
        return jdbc.update("DELETE FROM user_follows WHERE follower_id=? AND followee_id=?", follower, followee) > 0;
    }

    @Override
    public List<FollowPair> removeBetween(UUID first, UUID second) {
        return jdbc.query(
                "DELETE FROM user_follows WHERE (follower_id=? AND followee_id=?) OR (follower_id=? AND followee_id=?)"
                        + " RETURNING follower_id,followee_id",
                (row, index) -> new FollowPair(row.getObject("follower_id", UUID.class),
                        row.getObject("followee_id", UUID.class)),
                first, second, second, first);
    }

    @Override
    public boolean qualifiesForFollowerPoints(UUID follower) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS(SELECT 1 FROM users u WHERE u.id=? AND u.email_verified AND EXISTS("
                        + "SELECT 1 FROM reviews r WHERE r.user_id=u.id AND r.publication_status='APPROVED'))",
                Boolean.class, follower));
    }
}
