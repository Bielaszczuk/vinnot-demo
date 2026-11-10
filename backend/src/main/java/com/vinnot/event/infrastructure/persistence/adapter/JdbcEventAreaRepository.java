package com.vinnot.event.infrastructure.persistence.adapter;

import com.vinnot.event.application.port.in.ManageEventAreaUseCase.AreaView;
import com.vinnot.event.application.port.out.EventAreaRepository;
import com.vinnot.event.domain.valueobject.EventArea;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class JdbcEventAreaRepository implements EventAreaRepository {
    private final JdbcTemplate jdbc;

    @Override
    public Optional<AreaView> find(UUID userId) {
        return jdbc.query("""
                SELECT a.region_id, r.name FROM user_event_areas a LEFT JOIN regions r ON r.id = a.region_id
                WHERE a.user_id = ?
                """, (row, index) -> {
                    UUID region = row.getObject("region_id", UUID.class);
                    return Objects.isNull(region) ? new AreaView(AreaView.Kind.APPROXIMATE, null, null)
                            : new AreaView(AreaView.Kind.REGION, region, row.getString("name"));
                }, userId).stream().findFirst();
    }

    @Override
    public boolean save(UUID userId, EventArea area) {
        // The region is checked in the same statement, so an unknown one stores nothing.
        return jdbc.update("""
                INSERT INTO user_event_areas(user_id, region_id, latitude, longitude, updated_at)
                SELECT ?, ?::uuid, ?, ?, now() WHERE ?::uuid IS NULL OR EXISTS (SELECT 1 FROM regions WHERE id = ?::uuid)
                ON CONFLICT (user_id) DO UPDATE SET region_id = excluded.region_id, latitude = excluded.latitude,
                    longitude = excluded.longitude, updated_at = excluded.updated_at
                """, userId, area.regionId(), area.latitude(), area.longitude(), area.regionId(), area.regionId()) > 0;
    }

    @Override
    public void delete(UUID userId) {
        jdbc.update("DELETE FROM user_event_areas WHERE user_id = ?", userId);
    }
}
