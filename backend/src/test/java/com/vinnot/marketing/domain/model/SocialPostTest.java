package com.vinnot.marketing.domain.model;

import com.vinnot.marketing.domain.exception.InvalidPostCopyException;
import com.vinnot.marketing.domain.exception.InvalidPostTransitionException;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** S5: the approval queue transitions are domain rules; #497: copy per language, edited one language at a time. */
class SocialPostTest {
    private static final Instant PLANNED_AT = Instant.parse("2026-11-02T12:00:00Z");
    private static final Instant SLOT = Instant.parse("2026-11-03T22:00:00Z");
    private static final Instant LATER = PLANNED_AT.plusSeconds(3600);
    private static final List<PostCopy.Slide> SLIDES = List.of(new PostCopy.Slide("Uno", "a"), new PostCopy.Slide("Dos", "b"),
            new PostCopy.Slide("Tres", "c"));
    private static final PostCopy COPY = PostCopy.of(PostLanguage.ES, "Hola", SLIDES, "Texto",
            List.of("#vinnot", "#malbec", "#vino", "#cata", "#tinto"), "Alt", "¿Y tú?");
    private static final PostCopy COPY_EN = PostCopy.of(PostLanguage.EN, "Hello", SLIDES, "Text",
            List.of("#vinnot", "#malbec", "#wine", "#tasting", "#red"), "Alt", "And you?");
    private static final PostCopies COPIES = new PostCopies(COPY, COPY_EN);
    private static final GenerationInfo GENERATED = new GenerationInfo("openai", "gpt-4o-mini", false, 1, LATER, FactCheck.PASSED,
            List.of(), null);
    private final UUID reviewer = UUID.randomUUID();

    @Test
    void aPlannedPostIsADraftUntilItsCopyArrives() {
        SocialPost post = SocialPost.planned(UUID.randomUUID(), SLOT, "CURIOUS_FACT", null, PLANNED_AT);
        assertThat(post.status()).isEqualTo(SocialPostStatus.DRAFT);
        assertThat(post.copies()).isNull();
        assertThat(post.generation().attempts()).isZero();
        assertThatThrownBy(() -> post.approve(reviewer, LATER)).isInstanceOf(InvalidPostTransitionException.class);

        post.generationFailed(GenerationInfo.none().failed("AI_UNAVAILABLE", LATER), LATER);
        assertThat(post.status()).isEqualTo(SocialPostStatus.DRAFT);
        assertThat(post.generation().error()).isEqualTo("AI_UNAVAILABLE");
        assertThat(post.generation().attempts()).isEqualTo(1);

        post.copyGenerated(COPIES, GENERATED, LATER);
        assertThat(post.status()).isEqualTo(SocialPostStatus.PENDING_APPROVAL);
        assertThat(post.copies()).isEqualTo(COPIES);
        assertThat(post.updatedAt()).isEqualTo(LATER);
    }

    @Test
    void generatedCopyReachesPendingApprovalOnlyWithBothLanguages() {
        SocialPost post = SocialPost.planned(UUID.randomUUID(), SLOT, "CURIOUS_FACT", null, PLANNED_AT);

        assertThatThrownBy(() -> post.copyGenerated(PostCopies.only(PostLanguage.ES, COPY), GENERATED, LATER))
                .isInstanceOf(InvalidPostCopyException.class).hasMessageContaining("every language");

        assertThat(post.status()).isEqualTo(SocialPostStatus.DRAFT);
        assertThat(post.copies()).isNull();
        assertThat(post.media()).isNull();
    }

    @Test
    void approvalAndRejectionRecordTheReviewer() {
        SocialPost post = pending();
        post.approve(reviewer, LATER);
        assertThat(post.status()).isEqualTo(SocialPostStatus.APPROVED);
        assertThat(post.review()).isEqualTo(new PostReview(reviewer, LATER, null, null));
        assertThatThrownBy(() -> post.approve(reviewer, LATER)).isInstanceOf(InvalidPostTransitionException.class)
                .hasMessageContaining("APPROVED");

        SocialPost rejected = pending();
        rejected.reject(reviewer, "Muy largo", LATER);
        assertThat(rejected.status()).isEqualTo(SocialPostStatus.REJECTED);
        assertThat(rejected.review()).isEqualTo(new PostReview(reviewer, LATER, "Muy largo", null));
        assertThatThrownBy(() -> rejected.reject(reviewer, null, LATER)).isInstanceOf(InvalidPostTransitionException.class);
        assertThatThrownBy(() -> rejected.edit(PostLanguage.ES, COPY, reviewer, LATER)).isInstanceOf(InvalidPostTransitionException.class);
    }

    @Test
    void editingKeepsPendingOrReopensAnApprovedPost() {
        SocialPost post = pending();
        UUID editor = UUID.randomUUID();
        post.edit(PostLanguage.ES, COPY, editor, LATER);
        assertThat(post.status()).isEqualTo(SocialPostStatus.PENDING_APPROVAL);
        assertThat(post.review().editedBy()).isEqualTo(editor);

        post.approve(reviewer, LATER);
        post.edit(PostLanguage.EN, COPY_EN, editor, LATER.plusSeconds(1));
        assertThat(post.status()).isEqualTo(SocialPostStatus.PENDING_APPROVAL);
        assertThat(post.review()).isEqualTo(new PostReview(reviewer, LATER, null, editor));
    }

    @Test
    void editingOneLanguageLeavesTheOtherAndItsMediaTargetAlone() {
        SocialPost post = pending();
        Map<PostLanguage, String> before = post.media().copyHashes();
        PostCopy english = PostCopy.of(PostLanguage.EN, "Goodbye", SLIDES, "Text", COPY_EN.hashtags(), "Alt", "And you?");

        post.edit(PostLanguage.EN, english, reviewer, LATER);

        assertThat(post.copies().es()).isEqualTo(COPY);
        assertThat(post.copies().en()).isEqualTo(english);
        assertThat(post.media().copyHashes().get(PostLanguage.ES)).isEqualTo(before.get(PostLanguage.ES));
        assertThat(post.media().copyHashes().get(PostLanguage.EN)).isEqualTo(english.mediaHash()).isNotEqualTo(before.get(PostLanguage.EN));

        SocialPost legacy = SocialPost.restore(UUID.randomUUID(), SocialPostStatus.PENDING_APPROVAL, SLOT, "CURIOUS_FACT", null,
                PostCopies.only(PostLanguage.ES, COPY), GENERATED, null, null, PLANNED_AT, PLANNED_AT);
        legacy.edit(PostLanguage.EN, COPY_EN, reviewer, LATER);
        assertThat(legacy.copies()).as("an edit may add the missing language of an old post").isEqualTo(COPIES);
        assertThatThrownBy(() -> legacy.edit(null, COPY, reviewer, LATER)).isInstanceOf(NullPointerException.class);
    }

    @Test
    void regenerationIsAllowedForPendingRejectedAndApprovedPostsOnly() {
        SocialPost rejected = pending();
        rejected.reject(reviewer, null, LATER);
        rejected.requireRegenerable();
        rejected.copyGenerated(COPIES, GENERATED, LATER);
        assertThat(rejected.status()).isEqualTo(SocialPostStatus.PENDING_APPROVAL);
        assertThat(rejected.review()).isNull();

        SocialPost pending = pending();
        pending.requireRegenerable();
        pending.copyGenerated(COPIES, GENERATED, LATER);
        assertThat(pending.status()).isEqualTo(SocialPostStatus.PENDING_APPROVAL);

        for (SocialPostStatus status : List.of(SocialPostStatus.SCHEDULED, SocialPostStatus.PUBLISHED, SocialPostStatus.FAILED,
                SocialPostStatus.DRAFT)) {
            SocialPost other = SocialPost.restore(UUID.randomUUID(), status, SLOT, "CURIOUS_FACT", null, COPIES, GENERATED, null, null,
                    PLANNED_AT, PLANNED_AT);
            assertThatThrownBy(other::requireRegenerable).as(status.name()).isInstanceOf(InvalidPostTransitionException.class);
        }
        SocialPost scheduled = SocialPost.restore(UUID.randomUUID(), SocialPostStatus.SCHEDULED, SLOT, "CURIOUS_FACT", null, COPIES,
                GENERATED, null, null, PLANNED_AT, PLANNED_AT);
        assertThatThrownBy(() -> scheduled.copyGenerated(COPIES, GENERATED, LATER)).isInstanceOf(InvalidPostTransitionException.class);
        assertThat(new InvalidPostTransitionException(SocialPostStatus.APPROVED, "approve").getCode())
                .isEqualTo(InvalidPostTransitionException.CODE);
    }

    @Test
    void regeneratingAnApprovedPostDropsItsApprovalAndReturnsItToPending() {
        SocialPost approved = pending();
        approved.approve(reviewer, LATER);
        approved.requireRegenerable();

        approved.copyGenerated(COPIES, GENERATED, LATER.plusSeconds(5));

        assertThat(approved.status()).isEqualTo(SocialPostStatus.PENDING_APPROVAL);
        assertThat(approved.review()).as("the approver and the approval time are gone").isNull();

        SocialPost failing = pending();
        failing.approve(reviewer, LATER);
        failing.generationFailed(failing.generation().failed("AI_UNAVAILABLE", LATER), LATER);
        assertThat(failing.status()).as("a failed regeneration leaves the approved post as it was").isEqualTo(SocialPostStatus.APPROVED);
        assertThat(failing.review()).isEqualTo(new PostReview(reviewer, LATER, null, null));
        assertThat(failing.generation().error()).isEqualTo("AI_UNAVAILABLE");
    }

    private static SocialPost pending() {
        SocialPost post = SocialPost.planned(UUID.randomUUID(), SLOT, "CURIOUS_FACT", null, PLANNED_AT);
        post.copyGenerated(COPIES, GENERATED, LATER);
        return post;
    }

    @Test
    void newCopyMakesTheMediaPendingForItsHashesAndAnEditKeepsTheIllustrationSubject() {
        SocialPost post = SocialPost.planned(UUID.randomUUID(), SLOT, "CURIOUS_FACT", null, PLANNED_AT);
        assertThat(post.media()).isNull();
        assertThat(post.prepareMedia(LATER)).isFalse();

        PostCopies illustrated = COPIES.withIllustration("a bunch of grapes");
        post.copyGenerated(illustrated, GENERATED, LATER);
        assertThat(post.media().status()).isEqualTo(SocialPostMedia.Status.PENDING);
        assertThat(post.media().copyHashes()).isEqualTo(illustrated.mediaHashes());
        assertThat(post.media().illustrationVersion()).isEqualTo(1);

        PostCopy edited = PostCopy.of(PostLanguage.ES, "Chau", SLIDES, "Texto", COPY.hashtags(), "Alt", "¿Y tú?");
        post.edit(PostLanguage.ES, edited, reviewer, LATER);
        assertThat(post.copies().illustration()).isEqualTo("a bunch of grapes");
        assertThat(post.copies().es().illustration()).isEqualTo("a bunch of grapes");
        assertThat(post.media().copyHashes()).isEqualTo(post.copies().mediaHashes());
        assertThat(post.media().illustrationVersion()).isEqualTo(1);

        post.edit(PostLanguage.ES, PostCopy.of(PostLanguage.ES, "Chau", SLIDES, "Texto", COPY.hashtags(), "Alt", "¿Y tú?", "a cork"),
                reviewer, LATER);
        assertThat(post.copies().es().illustration()).isEqualTo("a cork");
        assertThat(post.copies().en().illustration()).as("the hero is shared, so is its subject").isEqualTo("a cork");
        assertThat(post.prepareMedia(LATER)).isTrue();
    }

    @Test
    void aNewIllustrationBumpsTheVersionUntilThePostIsPublished() {
        SocialPost draft = SocialPost.planned(UUID.randomUUID(), SLOT, "CURIOUS_FACT", null, PLANNED_AT);
        assertThatThrownBy(() -> draft.requestNewIllustration(LATER)).isInstanceOf(InvalidPostTransitionException.class)
                .hasMessageContaining("request a new illustration for");

        SocialPost legacy = SocialPost.restore(UUID.randomUUID(), SocialPostStatus.APPROVED, SLOT, "CURIOUS_FACT", null, COPIES, GENERATED,
                null, null, PLANNED_AT, PLANNED_AT);
        assertThat(legacy.media()).isNull();
        legacy.requestNewIllustration(LATER);
        assertThat(legacy.status()).isEqualTo(SocialPostStatus.APPROVED);
        assertThat(legacy.media().illustrationVersion()).isEqualTo(1);
        assertThat(legacy.media().copyHashes()).isEqualTo(COPIES.mediaHashes());
        legacy.requestNewIllustration(LATER);
        assertThat(legacy.media().illustrationVersion()).isEqualTo(2);
        assertThat(legacy.media().status()).isEqualTo(SocialPostMedia.Status.PENDING);

        SocialPost untouched = SocialPost.restore(UUID.randomUUID(), SocialPostStatus.PENDING_APPROVAL, SLOT, "CURIOUS_FACT", null,
                PostCopies.only(PostLanguage.ES, COPY), GENERATED, null, null, PLANNED_AT, PLANNED_AT);
        assertThat(untouched.prepareMedia(LATER)).isTrue();
        assertThat(untouched.media().illustrationVersion()).isEqualTo(1);
        assertThat(untouched.media().copyHashes()).as("an old post targets the languages it has").isEqualTo(Map.of(PostLanguage.ES,
                COPY.mediaHash()));

        SocialPost published = SocialPost.restore(UUID.randomUUID(), SocialPostStatus.PUBLISHED, SLOT, "CURIOUS_FACT", null, COPIES,
                GENERATED, null, null, PLANNED_AT, PLANNED_AT);
        assertThatThrownBy(() -> published.requestNewIllustration(LATER)).isInstanceOf(InvalidPostTransitionException.class);
        assertThat(published.prepareMedia(LATER)).isFalse();
    }
}
