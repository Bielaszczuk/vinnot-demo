package com.vinnot.review.domain.model;

import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Year;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ReviewTest {

    @Test
    void maintainsReviewContentAndCountersWithoutNegativeLikes() {
        Review review = Review.create(
                UUID.randomUUID(), UUID.randomUUID(), new BigDecimal("4.5"));

        assertThat(review.getPublicationStatus()).isEqualTo(PublicationStatus.APPROVED);

        review.updateContent(new BigDecimal("5.0"), "Excellent", "Long finish");
        review.verify();
        review.incrementHelpfulCount();
        review.incrementLikesCount();
        review.decrementLikesCount();
        review.decrementLikesCount();

        assertThat(review.getRating()).isEqualByComparingTo("5.0");
        assertThat(review.getTitle()).isEqualTo("Excellent");
        assertThat(review.getComment()).isEqualTo("Long finish");
        assertThat(review.getPublicationStatus()).isEqualTo(PublicationStatus.APPROVED);
        assertThat(review.isVerified()).isTrue();
        assertThat(review.getHelpfulCount()).isOne();
        assertThat(review.getLikesCount()).isZero();
    }

    @Test
    void enforcesRatingBoundariesOnCreationAndUpdate() {
        assertThatThrownBy(() -> Review.create(
                UUID.randomUUID(), UUID.randomUUID(), new BigDecimal("0.05")))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_RATING");

        Review review = Review.create(
                UUID.randomUUID(), UUID.randomUUID(), new BigDecimal("3.0"));
        assertThatThrownBy(() -> review.updateContent(
                new BigDecimal("5.1"), null, null))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_RATING");
    }

    @Test
    void acceptsTastedVintagesFrom1800ToNextYearAndAllowsClearingIt() {
        Review review = Review.create(
                UUID.randomUUID(), UUID.randomUUID(), new BigDecimal("4.0"));
        int nextYear = Year.now().getValue() + 1;

        assertThat(review.getVintage()).isNull();
        review.updateVintage(1800);
        assertThat(review.getVintage()).isEqualTo(1800);
        review.updateVintage(nextYear);
        assertThat(review.getVintage()).isEqualTo(nextYear);

        assertThatThrownBy(() -> review.updateVintage(1799))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_VINTAGE");
        assertThatThrownBy(() -> review.updateVintage(nextYear + 1))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_VINTAGE");
        assertThat(review.getVintage()).isEqualTo(nextYear);

        review.updateVintage(null);
        assertThat(review.getVintage()).isNull();
    }
}
