package com.vinnot.review.infrastructure.persistence.adapter;

import com.vinnot.cellar.application.port.out.CellarWineRepositoryPort;
import com.vinnot.cellar.domain.model.CellarWine;
import com.vinnot.review.application.port.out.CellarCommandPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;

@Component("reviewCellarCommandAdapter")
@RequiredArgsConstructor
public class CellarCommandAdapter implements CellarCommandPort {

    private static final Logger LOG = LoggerFactory.getLogger(CellarCommandAdapter.class);

    private final CellarWineRepositoryPort cellarWineRepository;

    @Override
    public void syncReviewToCellar(UUID userId, UUID wineId, BigDecimal rating, String notes, Integer vintage) {
        sync(userId, wineId, rating, notes, true, vintage);
    }

    @Override
    public void syncReviewRatingToCellar(UUID userId, UUID wineId, BigDecimal rating, Integer vintage) {
        sync(userId, wineId, rating, null, false, vintage);
    }

    private void sync(UUID userId, UUID wineId, BigDecimal rating, String notes, boolean replaceNotes, Integer vintage) {
        var existing = cellarWineRepository.findByUserIdAndWineId(userId, wineId);
        if (existing.isPresent()) {
            CellarWine cellarWine = existing.get();
            cellarWine.updateRating(rating);
            if (replaceNotes) {
                cellarWine.updateNotes(notes);
            }
            // A review without a vintage never erases the vintage kept in the cellar.
            if (Objects.nonNull(vintage)) {
                cellarWine.updateVintage(vintage);
            }
            cellarWineRepository.save(cellarWine);
            LOG.info("Updated cellar entry for user {} wine {} with rating {}",
                    userId, wineId, rating);
        } else {
            CellarWine cellarWine = CellarWine.create(userId, wineId);
            cellarWine.updateRating(rating);
            cellarWine.updateNotes(notes);
            cellarWine.updateVintage(vintage);
            cellarWineRepository.save(cellarWine);
            LOG.info("Auto-added wine {} to cellar for user {} with rating {}",
                    wineId, userId, rating);
        }

    }
}
