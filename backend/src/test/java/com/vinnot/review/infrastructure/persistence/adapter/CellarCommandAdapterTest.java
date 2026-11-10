package com.vinnot.review.infrastructure.persistence.adapter;

import java.math.BigDecimal;
import com.vinnot.cellar.application.port.out.CellarWineRepositoryPort;
import com.vinnot.cellar.domain.model.CellarWine;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CellarCommandAdapterTest {

    private final CellarWineRepositoryPort cellar = mock(CellarWineRepositoryPort.class);
    private final CellarCommandAdapter adapter = new CellarCommandAdapter(cellar);
    private final UUID userId = UUID.randomUUID();
    private final UUID wineId = UUID.randomUUID();

    @Test
    void ratingOnlySyncKeepsPrivateCellarNotes() {
        CellarWine entry = existingEntry();

        adapter.syncReviewRatingToCellar(userId, wineId, new BigDecimal("2"), null);

        assertThat(entry.getRating()).isEqualByComparingTo("2");
        assertThat(entry.getNotes()).isEqualTo("My private notes");
        verify(cellar).save(entry);
    }

    @Test
    void fullSyncStillReplacesRatingAndNotes() {
        CellarWine entry = existingEntry();

        adapter.syncReviewToCellar(userId, wineId, new BigDecimal("5"), "Review notes", null);

        assertThat(entry.getRating()).isEqualByComparingTo("5");
        assertThat(entry.getNotes()).isEqualTo("Review notes");
        verify(cellar).save(entry);
    }

    @Test
    void syncWithVintageSetsTheCellarVintage() {
        CellarWine entry = existingEntry();

        adapter.syncReviewToCellar(userId, wineId, new BigDecimal("5"), "Review notes", 2018);
        assertThat(entry.getVintage()).isEqualTo(2018);

        adapter.syncReviewRatingToCellar(userId, wineId, new BigDecimal("3"), 2019);
        assertThat(entry.getVintage()).isEqualTo(2019);
        assertThat(entry.getNotes()).isEqualTo("Review notes");
    }

    @Test
    void syncWithoutVintageLeavesTheCellarVintageUntouched() {
        CellarWine entry = existingEntry();
        entry.updateVintage(2015);

        adapter.syncReviewToCellar(userId, wineId, new BigDecimal("5"), "Review notes", null);
        adapter.syncReviewRatingToCellar(userId, wineId, new BigDecimal("3"), null);

        assertThat(entry.getVintage()).isEqualTo(2015);
    }

    @Test
    void autoAddedEntryTakesTheReviewRatingNotesAndVintage() {
        when(cellar.findByUserIdAndWineId(userId, wineId)).thenReturn(Optional.empty());

        adapter.syncReviewToCellar(userId, wineId, new BigDecimal("4"), "Review notes", 2018);

        ArgumentCaptor<CellarWine> saved = ArgumentCaptor.forClass(CellarWine.class);
        verify(cellar).save(saved.capture());
        assertThat(saved.getValue().getUserId()).isEqualTo(userId);
        assertThat(saved.getValue().getRating()).isEqualByComparingTo("4");
        assertThat(saved.getValue().getNotes()).isEqualTo("Review notes");
        assertThat(saved.getValue().getVintage()).isEqualTo(2018);
    }

    private CellarWine existingEntry() {
        CellarWine entry = CellarWine.create(userId, wineId);
        entry.updateRating(new BigDecimal("4"));
        entry.updateNotes("My private notes");
        when(cellar.findByUserIdAndWineId(userId, wineId)).thenReturn(Optional.of(entry));
        return entry;
    }
}
