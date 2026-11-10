package com.vinnot.gamification.domain.model;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** S2: the note and profile rules other modules apply, and the shape of awards and movements. */
class PointRulesTest {

    @Test
    void aNoteEarnsFromEightyCharactersWithoutSurroundingSpaces() {
        assertThat(PointRules.isLongNote("a".repeat(80))).isTrue();
        assertThat(PointRules.isLongNote("  " + "a".repeat(79) + "   ")).isFalse();
        assertThat(PointRules.isLongNote("🍷".repeat(80))).as("characters, not UTF-16 units").isTrue();
        assertThat(PointRules.isLongNote(null)).isFalse();
    }

    @Test
    void aCompleteProfileHasAPhotoBothNamesAndAPhone() {
        String phone = "+5491123456789";
        assertThat(PointRules.isCompleteProfile("https://cdn/a.webp", "Ana", "Gómez", phone)).isTrue();
        assertThat(PointRules.isCompleteProfile(null, "Ana", "Gómez", phone)).isFalse();
        assertThat(PointRules.isCompleteProfile("https://cdn/a.webp", " ", "Gómez", phone)).isFalse();
        assertThat(PointRules.isCompleteProfile("https://cdn/a.webp", "Ana", "", phone)).isFalse();
        assertThat(PointRules.isCompleteProfile("https://cdn/a.webp", "Ana", "Gómez", null)).isFalse();
        assertThat(PointRules.isCompleteProfile("https://cdn/a.webp", "Ana", "Gómez", " ")).isFalse();
    }

    @Test
    void likeKeysShareTheReviewPrefix() {
        UUID review = UUID.randomUUID();
        UUID liker = UUID.randomUUID();

        assertThat(PointRules.likeKey(review, liker)).isEqualTo(review + ":" + liker)
                .startsWith(PointRules.reviewKeyPrefix(review));
    }

    @Test
    void awardsAndMovementsKeepTheirMemberSourceAndKey() {
        UUID user = UUID.randomUUID();
        Instant at = Instant.parse("2026-10-27T12:00:00Z");
        PointAward award = new PointAward(user, PointSource.REVIEW, "wine", PointSubject.wine(UUID.randomUUID()), 3, true, at);

        assertThat(award.revoked().active()).isFalse();
        assertThat(PointMovement.awarded(award, at).points()).isEqualTo(3);
        assertThat(PointMovement.revoked(award, at).points()).isEqualTo(-3);
        assertThat(PointSubject.event(UUID.randomUUID()).kind()).isEqualTo(PointSubject.Kind.EVENT);
        assertThatThrownBy(() -> new PointAward(user, PointSource.REVIEW, " ", null, 3, true, at))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
