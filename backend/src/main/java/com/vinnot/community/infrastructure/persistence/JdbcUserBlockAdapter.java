package com.vinnot.community.infrastructure.persistence;

import com.vinnot.community.application.port.out.UserBlockRepositoryPort;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;

import lombok.RequiredArgsConstructor;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class JdbcUserBlockAdapter implements UserBlockRepositoryPort {
    private final JdbcTemplate jdbc;

    @Override
    public long countBlocked(UUID blocker) {
        return jdbc.queryForObject(
                "SELECT count(*) FROM user_blocks WHERE blocker_id=?", Long.class, blocker);
    }

    @Override
    public boolean userExists(UUID id) {
        return Boolean.TRUE.equals(
                jdbc.queryForObject(
                        "SELECT EXISTS(SELECT 1 FROM users WHERE id=?)", Boolean.class, id));
    }

    @Override
    public void block(UUID blocker, UUID blocked) {
        jdbc.update(
                "INSERT INTO user_blocks(blocker_id,blocked_id) VALUES (?,?) ON"
                        + " CONFLICT(blocker_id,blocked_id) DO NOTHING",
                blocker,
                blocked);
    }

    @Override
    public void unblock(UUID blocker, UUID blocked) {
        jdbc.update(
                "DELETE FROM user_blocks WHERE blocker_id=? AND blocked_id=?", blocker, blocked);
    }

    @Override
    public PageResult<BlockedUser> findBlocked(UUID blocker, PageQuery page) {
        long count = countBlocked(blocker);
        var rows =
                jdbc.query(
                        "SELECT b.blocked_id,u.username,b.created_at FROM user_blocks b JOIN users"
                            + " u ON u.id=b.blocked_id WHERE b.blocker_id=? ORDER BY b.created_at"
                            + " DESC,b.blocked_id LIMIT ? OFFSET ?",
                        (r, row) ->
                                new BlockedUser(
                                        r.getObject("blocked_id", UUID.class),
                                        r.getString("username"),
                                        r.getTimestamp("created_at").toInstant()),
                        blocker,
                        page.size(),
                        (long) page.page() * page.size());
        return PageResult.of(rows, page.page(), page.size(), count);
    }
}
