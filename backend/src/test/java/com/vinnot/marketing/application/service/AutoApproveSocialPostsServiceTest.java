package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.port.out.ContentPillarCatalog;
import com.vinnot.marketing.application.port.out.SocialPostRepository;
import com.vinnot.marketing.domain.model.ContentPillar;
import com.vinnot.marketing.domain.model.FactCheck;
import com.vinnot.marketing.domain.model.GenerationInfo;
import com.vinnot.marketing.domain.model.PostLanguage;
import com.vinnot.marketing.domain.model.PostReview;
import com.vinnot.marketing.domain.model.SocialPost;
import com.vinnot.marketing.domain.model.SocialPostMedia;
import com.vinnot.marketing.domain.model.SocialPostStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.vinnot.marketing.application.service.MarketingFixtures.COPIES;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * #510 S8: a pending post of an auto-approving pillar, with ready Spanish media and a passed fact check, is approved by the
 * system once its slot is 24 hours away or less but still ahead; the approval is a compare-and-set, so an admin's action meanwhile wins.
 */
class AutoApproveSocialPostsServiceTest {
    private static final Instant NOW = Instant.parse("2026-11-02T12:00:00Z");
    private static final Instant WITHIN_LEAD = NOW.plus(Duration.ofHours(10));
    private static final Instant EXACTLY_LEAD = NOW.plus(Duration.ofHours(24));
    private static final Instant BEYOND_LEAD = EXACTLY_LEAD.plusSeconds(1);
    private static final SocialPostMedia.SlideImages BOTH_FORMATS = new SocialPostMedia.SlideImages(
            List.of(new SocialPostMedia.Image("posts/p/es/instagram-01.jpg", "https://cdn/ig-1.jpg")),
            List.of(new SocialPostMedia.Image("posts/p/es/tiktok-01.jpg", "https://cdn/tt-1.jpg")));
    private final SocialPostRepository posts = mock(SocialPostRepository.class);
    private final ContentPillarCatalog pillars = mock(ContentPillarCatalog.class);
    private final AutoApproveSocialPostsService service = new AutoApproveSocialPostsService(posts, pillars, Duration.ofHours(24));

    @BeforeEach
    void pillars() {
        when(pillars.all()).thenReturn(List.of(new ContentPillar("CURIOUS_FACT", "Dato", "Fact", 2, "b", "b", 2, true),
                new ContentPillar("EDUCATION", "Educación", "Education", 2, "b", "b", 3, false)));
        when(posts.saveApprovalIfUnchanged(any(), any(), any())).thenReturn(true);
    }

    @Test
    void anEligiblePostIsApprovedBySystemWithAConditionalSave() {
        SocialPost post = eligible(WITHIN_LEAD);
        Instant storedAt = post.updatedAt();
        SocialPostMedia storedMedia = post.media();
        when(posts.findScheduledBetween(NOW, EXACTLY_LEAD)).thenReturn(List.of(post));

        assertThat(service.autoApprove(NOW)).isEqualTo(1);

        ArgumentCaptor<SocialPost> saved = ArgumentCaptor.forClass(SocialPost.class);
        verify(posts).saveApprovalIfUnchanged(saved.capture(), eq(storedAt), eq(storedMedia));
        assertThat(saved.getValue().status()).isEqualTo(SocialPostStatus.APPROVED);
        assertThat(saved.getValue().review()).isEqualTo(PostReview.automatic(NOW));
        verify(posts, never()).save(any());
    }

    @Test
    void onlyPendingPostsInsideTheLeadAreReadAndItsEndIsInclusive() {
        SocialPost atBoundary = eligible(EXACTLY_LEAD);
        SocialPost beyond = eligible(BEYOND_LEAD);
        SocialPost approved = eligible(WITHIN_LEAD);
        approved.approve(UUID.randomUUID(), NOW);
        when(posts.findScheduledBetween(NOW, EXACTLY_LEAD)).thenReturn(List.of(approved, atBoundary, beyond));

        assertThat(service.autoApprove(NOW)).isEqualTo(1);

        assertThat(atBoundary.status()).isEqualTo(SocialPostStatus.APPROVED);
        assertThat(beyond.status()).isEqualTo(SocialPostStatus.PENDING_APPROVAL);
        verify(posts, never()).saveApprovalIfUnchanged(eq(beyond), any(), any());
        verify(posts, never()).saveApprovalIfUnchanged(eq(approved), any(), any());
        verify(posts, never()).findByStatus(any(), anyInt());
    }

    @Test
    void aPendingPostWhoseSlotArrivedOrPassedIsNeverApproved() {
        SocialPost exactlyNow = eligible(NOW);
        SocialPost overdue = eligible(NOW.minusSeconds(60));
        when(posts.findScheduledBetween(NOW, EXACTLY_LEAD)).thenReturn(List.of(overdue, exactlyNow));
        when(posts.findByStatus(any(), anyInt())).thenReturn(List.of(overdue, exactlyNow));

        assertThat(service.autoApprove(NOW)).isZero();

        assertThat(exactlyNow.status()).isEqualTo(SocialPostStatus.PENDING_APPROVAL);
        assertThat(overdue.status()).isEqualTo(SocialPostStatus.PENDING_APPROVAL);
        verify(posts, never()).saveApprovalIfUnchanged(any(), any(), any());
    }

    @Test
    void aPillarWithoutAutoApprovalKeepsItsPostsPending() {
        SocialPost education = pending("EDUCATION", WITHIN_LEAD, FactCheck.PASSED, true);
        when(posts.findScheduledBetween(NOW, EXACTLY_LEAD)).thenReturn(List.of(education));

        assertThat(service.autoApprove(NOW)).isZero();
        assertThat(education.status()).isEqualTo(SocialPostStatus.PENDING_APPROVAL);
        verify(posts, never()).saveApprovalIfUnchanged(any(), any(), any());
    }

    @Test
    void mediaThatIsNotReadyKeepsThePostPending() {
        SocialPost notRendered = pending("CURIOUS_FACT", WITHIN_LEAD, FactCheck.PASSED, false);
        when(posts.findScheduledBetween(NOW, EXACTLY_LEAD)).thenReturn(List.of(notRendered));

        assertThat(service.autoApprove(NOW)).isZero();
        assertThat(notRendered.status()).isEqualTo(SocialPostStatus.PENDING_APPROVAL);
        verify(posts, never()).saveApprovalIfUnchanged(any(), any(), any());
    }

    @Test
    void onlyAPassedFactCheckLetsThePostThrough() {
        SocialPost flagged = pending("CURIOUS_FACT", WITHIN_LEAD, FactCheck.FLAGGED, true);
        SocialPost skipped = pending("CURIOUS_FACT", WITHIN_LEAD, FactCheck.SKIPPED, true);
        SocialPost unchecked = pending("CURIOUS_FACT", WITHIN_LEAD, null, true);
        when(posts.findScheduledBetween(NOW, EXACTLY_LEAD))
                .thenReturn(List.of(flagged, skipped, unchecked));

        assertThat(service.autoApprove(NOW)).isZero();
        verify(posts, never()).saveApprovalIfUnchanged(any(), any(), any());
    }

    @Test
    void anAdminActionMeanwhileWinsAndThePostIsNotCounted() {
        SocialPost raced = eligible(WITHIN_LEAD);
        SocialPost fine = eligible(WITHIN_LEAD.plusSeconds(60));
        when(posts.findScheduledBetween(NOW, EXACTLY_LEAD)).thenReturn(List.of(raced, fine));
        when(posts.saveApprovalIfUnchanged(eq(raced), any(), any())).thenReturn(false);

        assertThat(service.autoApprove(NOW)).isEqualTo(1);
        verify(posts).saveApprovalIfUnchanged(eq(fine), any(), any());
    }

    @Test
    void withoutAutoApprovingPillarsNothingIsRead() {
        when(pillars.all()).thenReturn(List.of(new ContentPillar("EDUCATION", "Educación", "Education", 2, "b", "b", 3)));

        assertThat(service.autoApprove(NOW)).isZero();
        verifyNoInteractions(posts);
    }

    private static SocialPost eligible(Instant slot) {
        return pending("CURIOUS_FACT", slot, FactCheck.PASSED, true);
    }

    private static SocialPost pending(String pillar, Instant slot, FactCheck factCheck, boolean rendered) {
        SocialPost post = MarketingFixtures.draft(slot, pillar, null);
        post.copyGenerated(COPIES, GenerationInfo.none().succeeded("openai", "gpt-4o-mini", false, factCheck, List.of(), NOW), NOW);
        SocialPostMedia media = rendered ? post.media().rendered(Map.of(PostLanguage.ES, BOTH_FORMATS, PostLanguage.EN, BOTH_FORMATS), NOW)
                : post.media();
        return SocialPost.restore(post.id(), post.status(), slot, pillar, null, post.copies(), post.generation(), post.review(), media,
                post.createdAt(), post.updatedAt());
    }
}
