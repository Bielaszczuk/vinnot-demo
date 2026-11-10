package com.vinnot.review.domain.model;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.vinnot.shared.domain.exception.BusinessRuleViolationException;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

class ReviewPublicationTest {
    @Test
    void enforcesIndependentCurrentReviewAndReasonedRejection() {
        UUID id = UUID.randomUUID(), author = UUID.randomUUID(), reviewer = UUID.randomUUID();
        Instant now = Instant.now();
        var item =
                new ReviewPublication(
                        ReviewPublication.Type.COMMENT,
                        id,
                        id,
                        id,
                        author,
                        null,
                        "",
                        "Text",
                        PublicationStatus.PENDING,
                        now,
                        now,
                        true);
        assertThat(item.validateDecision(reviewer, PublicationStatus.APPROVED, null, null, now))
                .isEqualTo(new ReviewPublication.Decision(null, ""));
        assertThat(item.validateDecision(reviewer, PublicationStatus.REJECTED, null, " Reason ", now))
                .as("a client without reason codes still rejects, as OTHER, and its note stays internal")
                .isEqualTo(new ReviewPublication.Decision(PublicationRejectionReason.OTHER, "Reason", true))
                .extracting(ReviewPublication.Decision::authorNote).isNull();
        assertThat(item.validateDecision(reviewer, PublicationStatus.REJECTED, PublicationRejectionReason.OTHER, " Why ", now)
                .authorNote()).as("an explicit OTHER shares its note with the author").isEqualTo("Why");
        assertThat(item.validateDecision(reviewer, PublicationStatus.REJECTED, PublicationRejectionReason.SPAM, "Internal", now)
                .authorNote()).as("a preset reason keeps its note internal").isNull();
        assertThat(item.validateDecision(reviewer, PublicationStatus.REJECTED, PublicationRejectionReason.SPAM, null, now))
                .isEqualTo(new ReviewPublication.Decision(PublicationRejectionReason.SPAM, ""));
        assertThatThrownBy(() -> item.validateDecision(
                        reviewer, PublicationStatus.APPROVED, PublicationRejectionReason.SPAM, "", now))
                .as("an approval carries no reason").isInstanceOf(BusinessRuleViolationException.class);
        assertThatThrownBy(() -> item.validateDecision(author, PublicationStatus.APPROVED, null, "", now))
                .isInstanceOf(BusinessRuleViolationException.class);
        assertThatThrownBy(
                        () -> item.validateDecision(reviewer, PublicationStatus.PENDING, null, "", now))
                .isInstanceOf(BusinessRuleViolationException.class);
        assertThatThrownBy(
                        () ->
                                item.validateDecision(
                                        reviewer,
                                        PublicationStatus.APPROVED, null,
                                        "",
                                        now.minusSeconds(1)))
                .isInstanceOf(BusinessRuleViolationException.class);
        assertThatThrownBy(
                        () -> item.validateDecision(reviewer, PublicationStatus.REJECTED, null, " ", now))
                .isInstanceOf(BusinessRuleViolationException.class);
        assertThatThrownBy(
                        () ->
                                item.validateDecision(
                                        reviewer,
                                        PublicationStatus.APPROVED, null,
                                        "x".repeat(2001),
                                        now))
                .isInstanceOf(BusinessRuleViolationException.class);
        var parentPending =
                new ReviewPublication(
                        item.type(),
                        id,
                        id,
                        id,
                        author,
                        null,
                        "",
                        "Text",
                        PublicationStatus.PENDING,
                        now,
                        now,
                        false);
        assertThatThrownBy(
                        () ->
                                parentPending.validateDecision(
                                        reviewer, PublicationStatus.APPROVED, null, "", now))
                .isInstanceOf(BusinessRuleViolationException.class);
        var reviewed =
                new ReviewPublication(
                        item.type(),
                        id,
                        id,
                        id,
                        author,
                        null,
                        "",
                        "Text",
                        PublicationStatus.APPROVED,
                        now,
                        now,
                        true);
        assertThatThrownBy(
                        () ->
                                reviewed.validateDecision(
                                        reviewer, PublicationStatus.REJECTED, null, "Reason", now))
                .isInstanceOf(BusinessRuleViolationException.class);
    }
}
