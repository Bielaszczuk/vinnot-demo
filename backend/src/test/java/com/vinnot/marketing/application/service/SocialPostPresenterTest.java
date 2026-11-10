package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.model.PublishingSettings;
import com.vinnot.marketing.application.model.SocialPostAdminResponse;
import com.vinnot.marketing.application.port.out.ContentPillarCatalog;
import com.vinnot.marketing.application.port.out.ReviewerEmails;
import com.vinnot.marketing.application.port.out.SocialMetricsRepository;
import com.vinnot.marketing.application.port.out.SocialPublicationRepository;
import com.vinnot.marketing.application.port.out.WineDayCatalog;
import com.vinnot.marketing.domain.model.FactCheck;
import com.vinnot.marketing.domain.model.PostCopies;
import com.vinnot.marketing.domain.model.PostLanguage;
import com.vinnot.marketing.domain.model.PostPublishing;
import com.vinnot.marketing.domain.model.PublicationMetrics;
import com.vinnot.marketing.domain.model.PublicationStatus;
import com.vinnot.marketing.domain.model.SocialNetwork;
import com.vinnot.marketing.domain.model.SocialPost;
import com.vinnot.marketing.domain.model.SocialPostMedia;
import com.vinnot.marketing.domain.model.SocialPostStatus;
import com.vinnot.marketing.domain.model.SocialPublication;
import com.vinnot.marketing.domain.service.WeeklyPlanner;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.vinnot.marketing.application.service.MarketingFixtures.NOW;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * S7: the admin response names the pillar and the wine day with its date, and nests copy, generation and review. #497 S9:
 * copies and slides per language, null while a language is missing. #513 S7: whether the post may be rescheduled or published
 * now, and when it goes out on each enabled network.
 */
class SocialPostPresenterTest {
    private static final ZoneId ARGENTINA = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final PublishingSettings PUBLISHING_ON = new PublishingSettings(true, EnumSet.of(SocialNetwork.INSTAGRAM,
            SocialNetwork.TIKTOK), Duration.ofHours(6), ARGENTINA, Map.of(SocialNetwork.TIKTOK, LocalTime.of(19, 30)));
    private final ContentPillarCatalog pillars = mock(ContentPillarCatalog.class);
    private final WineDayCatalog wineDays = mock(WineDayCatalog.class);
    private final ReviewerEmails reviewers = mock(ReviewerEmails.class);
    private final SocialPublicationRepository publications = mock(SocialPublicationRepository.class);
    private final SocialMetricsRepository metrics = mock(SocialMetricsRepository.class);
    private final SocialPostPresenter presenter = presenter(PUBLISHING_ON);

    @Test
    void presentsAPendingWineDayPost() {
        when(pillars.all()).thenReturn(MarketingFixtures.PILLARS);
        when(wineDays.all()).thenReturn(List.of(MarketingFixtures.MERLOT));
        SocialPost post = MarketingFixtures.pending(MarketingFixtures.SATURDAY_SLOT, "WINE_DAY", "MERLOT");

        SocialPostAdminResponse response = presenter.present(post);

        assertThat(response.id()).isEqualTo(post.id());
        assertThat(response.status()).isEqualTo(SocialPostStatus.PENDING_APPROVAL);
        assertThat(response.scheduledFor()).isEqualTo(MarketingFixtures.SATURDAY_SLOT);
        assertThat(response.pillar()).isEqualTo(new SocialPostAdminResponse.Pillar("WINE_DAY", "Día del vino", "Wine day"));
        assertThat(response.wineDay()).isEqualTo(new SocialPostAdminResponse.WineDayRef("MERLOT", "Día Internacional del Merlot",
                "International Merlot Day", LocalDate.of(2026, 11, 7)));
        assertThat(response.copies().es().hook()).isEqualTo("Merlot, el tinto amable");
        assertThat(response.copies().es().slides()).hasSize(3);
        assertThat(response.copies().es().hashtags()).isEqualTo(MarketingFixtures.TAGS);
        assertThat(response.copies().en().hook()).isEqualTo("Merlot, the gentle red");
        assertThat(response.copies().en().caption()).endsWith(PostLanguage.EN.legalLine());
        assertThat(response.generation()).isEqualTo(new SocialPostAdminResponse.Generation("openai", "gpt-4o-mini", false, 1, NOW,
                FactCheck.PASSED, List.of(), null));
        assertThat(response.review()).isNull();
        assertThat(response.publishing()).isNull();
        assertThat(response.publications()).isEmpty();
        assertThat(response.createdAt()).isEqualTo(NOW);
        verify(reviewers, never()).emailsOf(any());
        verify(metrics, never()).latestByPublication(any());
    }

    @Test
    void aDraftWithoutCopyOrWineDayHasNulls() {
        when(pillars.all()).thenReturn(MarketingFixtures.PILLARS);
        when(wineDays.all()).thenReturn(List.of());
        SocialPost post = MarketingFixtures.draft(MarketingFixtures.TUESDAY_SLOT, "CURIOUS_FACT", null);
        UUID reviewer = UUID.randomUUID();

        SocialPostAdminResponse response = presenter.present(post);

        assertThat(response.wineDay()).isNull();
        assertThat(response.copies()).isEqualTo(new SocialPostAdminResponse.Copies(null, null));
        assertThat(response.generation().attempts()).isZero();
        assertThat(response.generation().factCheck()).isNull();

        SocialPost approved = MarketingFixtures.pending(MarketingFixtures.TUESDAY_SLOT, "CURIOUS_FACT", null);
        approved.approve(reviewer, NOW);
        when(reviewers.emailsOf(List.of(reviewer))).thenReturn(Map.of());
        assertThat(presenter.present(approved).review()).isEqualTo(new SocialPostAdminResponse.Review(reviewer, null, NOW, null, null, null,
                false));
    }

    @Test
    void namesWhoReviewedAndEditedThePostByEmail() {
        when(pillars.all()).thenReturn(MarketingFixtures.PILLARS);
        when(wineDays.all()).thenReturn(List.of());
        UUID reviewer = UUID.randomUUID();
        UUID editor = UUID.randomUUID();
        SocialPost post = MarketingFixtures.pending(MarketingFixtures.TUESDAY_SLOT, "CURIOUS_FACT", null);
        post.approve(reviewer, NOW);
        post.edit(PostLanguage.ES, post.copies().es(), editor, NOW);
        when(reviewers.emailsOf(List.of(reviewer, editor))).thenReturn(Map.of(reviewer, "ana@vinnot.com", editor, "leo@vinnot.com"));

        assertThat(presenter.present(post).review()).isEqualTo(
                new SocialPostAdminResponse.Review(reviewer, "ana@vinnot.com", NOW, null, editor, "leo@vinnot.com", false));
    }

    @Test
    void presentsTheSharedHeroAndOneSlideSetPerLanguageHidingSlidesRenderedForOtherCopy() {
        when(pillars.all()).thenReturn(MarketingFixtures.PILLARS);
        when(wineDays.all()).thenReturn(List.of());
        SocialPost post = MarketingFixtures.pending(MarketingFixtures.TUESDAY_SLOT, "CURIOUS_FACT", null);
        SocialPostMedia.Image hero = new SocialPostMedia.Image("posts/p/hero-a.png", "https://cdn/hero-a.png");
        SocialPostMedia ready = post.media().withIllustration(SocialPostMedia.Illustration.ai(1, "grapes", hero), NOW).rendered(Map.of(
                PostLanguage.ES, new SocialPostMedia.SlideImages(List.of(image("es/instagram-01-a.jpg")), List.of(image("es/tiktok-01-a.jpg"))),
                PostLanguage.EN, new SocialPostMedia.SlideImages(List.of(image("en/instagram-01-b.jpg")), List.of(image("en/tiktok-01-b.jpg")))),
                NOW);
        SocialPost rendered = SocialPost.restore(post.id(), post.status(), post.scheduledFor(), post.pillarCode(), null,
                post.copies().withIllustration("grapes"), post.generation(), null, ready, NOW, NOW);

        SocialPostAdminResponse.Media media = presenter.present(rendered).media();

        String es = ready.copyHashes().get(PostLanguage.ES);
        String en = ready.copyHashes().get(PostLanguage.EN);
        assertThat(media).isEqualTo(new SocialPostAdminResponse.Media(SocialPostMedia.Status.READY, SocialPostMedia.Source.AI, null,
                null, "https://cdn/hero-a.png", new SocialPostAdminResponse.SlideSets(
                new SocialPostAdminResponse.SlideSet(List.of("https://cdn/es/instagram-01-a.jpg"), List.of("https://cdn/es/tiktok-01-a.jpg"), es),
                new SocialPostAdminResponse.SlideSet(List.of("https://cdn/en/instagram-01-b.jpg"), List.of("https://cdn/en/tiktok-01-b.jpg"), en)),
                NOW));
        assertThat(presenter.present(rendered).copies().es().illustration()).isEqualTo("grapes");
        assertThat(presenter.present(rendered).copies().en().illustration()).isEqualTo("grapes");

        SocialPostMedia stale = ready.forCopy(Map.of(PostLanguage.ES, es, PostLanguage.EN, "other-hash"), NOW)
                .withIllustration(SocialPostMedia.Illustration.fallback(1, "grapes", "AI_IMAGE_UNAVAILABLE"), NOW).failed("TEXT_DOES_NOT_FIT", NOW);
        SocialPost edited = SocialPost.restore(post.id(), post.status(), post.scheduledFor(), post.pillarCode(), null, post.copies(),
                post.generation(), null, stale, NOW, NOW);
        assertThat(presenter.present(edited).media()).isEqualTo(new SocialPostAdminResponse.Media(SocialPostMedia.Status.FAILED,
                SocialPostMedia.Source.FALLBACK, "TEXT_DOES_NOT_FIT", "AI_IMAGE_UNAVAILABLE", null, new SocialPostAdminResponse.SlideSets(
                new SocialPostAdminResponse.SlideSet(List.of("https://cdn/es/instagram-01-a.jpg"), List.of("https://cdn/es/tiktok-01-a.jpg"), es),
                new SocialPostAdminResponse.SlideSet(List.of(), List.of(), en)), NOW));

        SocialPostMedia waiting = SocialPostMedia.pending(Map.of(PostLanguage.ES, "hash"), 1, NOW);
        SocialPost pending = SocialPost.restore(post.id(), post.status(), post.scheduledFor(), post.pillarCode(), null,
                PostCopies.only(PostLanguage.ES, MarketingFixtures.COPY), post.generation(), null, waiting, NOW, NOW);
        SocialPostAdminResponse legacy = presenter.present(pending);
        assertThat(legacy.media()).isEqualTo(new SocialPostAdminResponse.Media(SocialPostMedia.Status.PENDING, null, null, null, null,
                new SocialPostAdminResponse.SlideSets(null, null), NOW));
        assertThat(legacy.copies().en()).as("a post stored before #497 has no English yet").isNull();
        assertThat(legacy.copies().es().hook()).isEqualTo(MarketingFixtures.COPY.hook());
        assertThat(presenter.present(MarketingFixtures.draft(MarketingFixtures.TUESDAY_SLOT, "CURIOUS_FACT", null)).media()).isNull();
    }

    private static SocialPostMedia.Image image(String file) {
        return new SocialPostMedia.Image("posts/p/" + file, "https://cdn/" + file);
    }

    @Test
    void aPublishedPostShowsItsPublishingAndEachNetworkWithItsLatestMetrics() {
        when(pillars.all()).thenReturn(MarketingFixtures.PILLARS);
        when(wineDays.all()).thenReturn(List.of());
        SocialPost post = MarketingFixtures.pending(MarketingFixtures.TUESDAY_SLOT, "CURIOUS_FACT", null);
        SocialPost published = SocialPost.restore(post.id(), SocialPostStatus.PUBLISHED, post.scheduledFor(), post.pillarCode(), null,
                post.copies(), post.generation(), post.review(), post.media(), new PostPublishing(NOW,
                        NOW.plusSeconds(60), null), NOW, NOW);
        SocialPublication instagram = SocialPublication.restore(UUID.randomUUID(), post.id(), SocialNetwork.INSTAGRAM,
                PublicationStatus.PUBLISHED, "ig-1", "https://www.instagram.com/p/abc/", 1, null, NOW, NOW, NOW.plusSeconds(30));
        SocialPublication tiktok = SocialPublication.restore(UUID.randomUUID(), post.id(), SocialNetwork.TIKTOK,
                PublicationStatus.DRAFT_SENT, "tt-1", null, 2, null, NOW, NOW, NOW.plusSeconds(60));
        when(publications.findByPost(post.id())).thenReturn(List.of(instagram, tiktok));
        when(metrics.latestByPublication(List.of(instagram.id(), tiktok.id()))).thenReturn(Map.of(instagram.id(),
                new PublicationMetrics(120L, 100L, 9L, 2L, 1L, 0L, null)));

        SocialPostAdminResponse response = presenter.present(published);

        assertThat(response.publishing()).isEqualTo(new SocialPostAdminResponse.Publishing(NOW, NOW.plusSeconds(60), null));
        assertThat(response.publications()).containsExactly(
                new SocialPostAdminResponse.Publication(SocialNetwork.INSTAGRAM, PublicationStatus.PUBLISHED, "ig-1",
                        "https://www.instagram.com/p/abc/", 1, null, NOW.plusSeconds(30),
                        new SocialPostAdminResponse.Metrics(120L, 100L, 9L, 2L, 1L, 0L, null)),
                new SocialPostAdminResponse.Publication(SocialNetwork.TIKTOK, PublicationStatus.DRAFT_SENT, "tt-1", null, 2, null,
                        NOW.plusSeconds(60), null));
    }

    @Test
    void aSystemApprovalIsMarkedAutomatic() {
        when(pillars.all()).thenReturn(MarketingFixtures.PILLARS);
        when(wineDays.all()).thenReturn(List.of());
        SocialPost post = MarketingFixtures.pending(MarketingFixtures.TUESDAY_SLOT, "CURIOUS_FACT", null);
        post.autoApprove(NOW);
        when(reviewers.emailsOf(List.of())).thenReturn(Map.of());

        SocialPostAdminResponse.Review review = presenter.present(post).review();

        assertThat(review).isEqualTo(new SocialPostAdminResponse.Review(null, null, NOW, "AUTO_APPROVED", null, null, true));
    }

    @Test
    void aPostThatDidNotStartPublishingMayBeRescheduledButOnlyAnApprovedReadyOneMayBePublishedNow() {
        when(pillars.all()).thenReturn(MarketingFixtures.PILLARS);
        when(wineDays.all()).thenReturn(List.of());
        when(reviewers.emailsOf(any())).thenReturn(Map.of());

        SocialPostAdminResponse pending = presenter.present(MarketingFixtures.pending(MarketingFixtures.TUESDAY_SLOT, "CURIOUS_FACT", null));
        SocialPostAdminResponse approvedWithoutMedia = presenter.present(PublishingFixtures.approved(false));
        SocialPostAdminResponse approved = presenter.present(PublishingFixtures.approved(true));
        SocialPostAdminResponse scheduled = presenter.present(PublishingFixtures.scheduled());

        assertThat(pending.canReschedule()).isTrue();
        assertThat(pending.canPublishNow()).isFalse();
        assertThat(approvedWithoutMedia.canReschedule()).isTrue();
        assertThat(approvedWithoutMedia.canPublishNow()).as("media not ready").isFalse();
        assertThat(approved.canReschedule()).isTrue();
        assertThat(approved.canPublishNow()).isTrue();
        assertThat(scheduled.canReschedule()).isFalse();
        assertThat(scheduled.canPublishNow()).isFalse();
    }

    @Test
    void nothingIsPublishedNowWhilePublishingOrEveryNetworkIsOff() {
        when(pillars.all()).thenReturn(MarketingFixtures.PILLARS);
        when(wineDays.all()).thenReturn(List.of());
        when(reviewers.emailsOf(any())).thenReturn(Map.of());
        SocialPost approved = PublishingFixtures.approved(true);

        SocialPostAdminResponse off = presenter(new PublishingSettings(false, EnumSet.of(SocialNetwork.INSTAGRAM), Duration.ofHours(6),
                ARGENTINA, Map.of())).present(approved);
        SocialPostAdminResponse noNetwork = presenter(new PublishingSettings(true, EnumSet.noneOf(SocialNetwork.class), Duration.ofHours(6),
                ARGENTINA, Map.of())).present(approved);

        assertThat(off.canPublishNow()).isFalse();
        assertThat(off.networkSchedule()).as("nothing goes out while publishing is off").isEmpty();
        assertThat(off.canReschedule()).isTrue();
        assertThat(noNetwork.canPublishNow()).isFalse();
        assertThat(noNetwork.networkSchedule()).isEmpty();
    }

    @Test
    void eachEnabledNetworkGoesOutAtThePostTimeOrAtItsLaterNotBeforeTimeOfThatDay() {
        when(pillars.all()).thenReturn(MarketingFixtures.PILLARS);
        when(wineDays.all()).thenReturn(List.of());
        Instant noon = Instant.parse("2026-11-04T15:30:00Z");
        Instant night = Instant.parse("2026-11-04T23:45:00Z");

        assertThat(presenter.present(MarketingFixtures.draft(noon, "CURIOUS_FACT", null)).networkSchedule()).containsExactly(
                new SocialPostAdminResponse.NetworkSchedule(SocialNetwork.INSTAGRAM, noon),
                new SocialPostAdminResponse.NetworkSchedule(SocialNetwork.TIKTOK, Instant.parse("2026-11-04T22:30:00Z")));
        assertThat(presenter.present(MarketingFixtures.draft(night, "CURIOUS_FACT", null)).networkSchedule()).containsExactly(
                new SocialPostAdminResponse.NetworkSchedule(SocialNetwork.INSTAGRAM, night),
                new SocialPostAdminResponse.NetworkSchedule(SocialNetwork.TIKTOK, night));
    }

    @Test
    void theNetworkTimesDisappearOnceThePostStartsPublishingBecauseItsPublicationsTellTheRest() {
        when(pillars.all()).thenReturn(MarketingFixtures.PILLARS);
        when(wineDays.all()).thenReturn(List.of());
        when(reviewers.emailsOf(any())).thenReturn(Map.of());

        assertThat(presenter.present(PublishingFixtures.approved(true)).networkSchedule()).isNotEmpty();
        assertThat(presenter.present(PublishingFixtures.scheduled()).networkSchedule())
                .as("publish now skips TikTok's 19:30, so a time computed from the post would be wrong").isEmpty();
    }

    private SocialPostPresenter presenter(PublishingSettings publishing) {
        return new SocialPostPresenter(pillars, wineDays, WeeklyPlanner.Settings.defaults(), reviewers, publications, metrics, publishing);
    }
}
