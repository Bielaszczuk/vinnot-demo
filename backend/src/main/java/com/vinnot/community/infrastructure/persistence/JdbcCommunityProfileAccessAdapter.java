package com.vinnot.community.infrastructure.persistence;

import com.vinnot.community.application.port.out.CommunityProfileAccessPort;

import lombok.RequiredArgsConstructor;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class JdbcCommunityProfileAccessAdapter implements CommunityProfileAccessPort {
    private final JdbcTemplate jdbc;

    @Override
    public boolean blockedBetween(UUID viewer, UUID author) {
        return Boolean.TRUE.equals(
                jdbc.queryForObject(
                        "SELECT EXISTS(SELECT 1 FROM user_blocks WHERE (blocker_id=? AND"
                            + " blocked_id=?) OR (blocker_id=? AND blocked_id=?))",
                        Boolean.class,
                        viewer,
                        author,
                        author,
                        viewer));
    }
}
