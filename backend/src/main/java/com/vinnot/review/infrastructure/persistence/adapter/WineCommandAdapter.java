package com.vinnot.review.infrastructure.persistence.adapter;

import com.vinnot.review.application.port.out.WineCommandPort;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import lombok.RequiredArgsConstructor;
import java.math.BigDecimal;
import java.util.UUID;

@Component("reviewWineCommandAdapter")
@RequiredArgsConstructor
public class WineCommandAdapter implements WineCommandPort {
    private final JdbcTemplate jdbc;

    @Override
    public void lockRatingStats(UUID wineId) {
        if (jdbc.queryForList("SELECT id FROM wines WHERE id = ? FOR UPDATE", UUID.class, wineId).isEmpty()) {
            throw new EntityNotFoundException("Wine", wineId);
        }
    }

    @Override
    public void updateRatingStats(UUID wineId, BigDecimal ratingAverage, int ratingCount) {
        jdbc.update("UPDATE wines SET rating_average = ?, rating_count = ? WHERE id = ?",
                ratingAverage, ratingCount, wineId);
    }
}
