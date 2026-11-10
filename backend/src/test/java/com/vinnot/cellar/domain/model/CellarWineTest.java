package com.vinnot.cellar.domain.model;

import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Year;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CellarWineTest {

    @Test
    void createsAndUpdatesPersonalCellarData() {
        CellarWine entry = CellarWine.create(UUID.randomUUID(), UUID.randomUUID());

        entry.updateRating(new BigDecimal("4"));
        entry.updatePurchasePrice(new BigDecimal("12500.50"));
        entry.updateNotes("Open in 2028");

        assertThat(entry.getRating()).isEqualByComparingTo("4");
        assertThat(entry.getPurchasePrice()).isEqualByComparingTo("12500.50");
        assertThat(entry.getNotes()).isEqualTo("Open in 2028");
        assertThat(entry.getUpdatedAt()).isNotNull();
    }

    @Test
    void rejectsRatingsOutsideTheCellarScaleAndAllowsClearingIt() {
        CellarWine entry = CellarWine.create(UUID.randomUUID(), UUID.randomUUID());

        assertThatThrownBy(() -> entry.updateRating(BigDecimal.ZERO))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_RATING");
        assertThatThrownBy(() -> entry.updateRating(new BigDecimal("6")))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_RATING");

        entry.updateRating(null);
        assertThat(entry.getRating()).isNull();
    }

    @Test
    void acceptsTastedVintagesFrom1800ToNextYearAndAllowsClearingIt() {
        CellarWine entry = CellarWine.create(UUID.randomUUID(), UUID.randomUUID());
        int nextYear = Year.now().getValue() + 1;

        assertThat(entry.getVintage()).isNull();
        entry.updateVintage(1800);
        assertThat(entry.getVintage()).isEqualTo(1800);
        entry.updateVintage(nextYear);
        assertThat(entry.getVintage()).isEqualTo(nextYear);

        assertThatThrownBy(() -> entry.updateVintage(1799))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_VINTAGE");
        assertThatThrownBy(() -> entry.updateVintage(nextYear + 1))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_VINTAGE");
        assertThat(entry.getVintage()).isEqualTo(nextYear);

        entry.updateVintage(null);
        assertThat(entry.getVintage()).isNull();
    }
}
