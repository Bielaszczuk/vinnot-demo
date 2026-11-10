package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.model.PublishingSettings;
import com.vinnot.marketing.application.model.SocialPostAdminResponse;
import com.vinnot.marketing.application.port.out.ContentPillarCatalog;
import com.vinnot.marketing.application.port.out.ReviewerEmails;
import com.vinnot.marketing.application.port.out.SocialMetricsRepository;
import com.vinnot.marketing.application.port.out.SocialPublicationRepository;
import com.vinnot.marketing.application.port.out.WineDayCatalog;
import com.vinnot.marketing.domain.model.GenerationInfo;
import com.vinnot.marketing.domain.model.PostCopies;
import com.vinnot.marketing.domain.model.PostCopy;
import com.vinnot.marketing.domain.model.PostLanguage;
import com.vinnot.marketing.domain.model.PostPublishing;
import com.vinnot.marketing.domain.model.PostReview;
import com.vinnot.marketing.domain.model.PublicationMetrics;
import com.vinnot.marketing.domain.model.SocialPost;
import com.vinnot.marketing.domain.model.SocialPostMedia;
import com.vinnot.marketing.domain.model.SocialPublication;
import com.vinnot.marketing.domain.service.WeeklyPlanner;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Stream;

/**
 * Projects a post into the admin response, naming its pillar, its wine day and who reviewed it (#489), with its copy and
 * slides per language (#497), its publishing record and its publication on each network with the latest metrics (#510), and
 * whether the admin may reschedule it or publish it now, with its time on each network that publishes (#513 S7).
 */
@Service
@RequiredArgsConstructor
public class SocialPostPresenter {
    private final ContentPillarCatalog pillars;
    private final WineDayCatalog wineDays;
    private final WeeklyPlanner.Settings settings;
    private final ReviewerEmails reviewers;
    private final SocialPublicationRepository publications;
    private final SocialMetricsRepository metrics;
    private final PublishingSettings publishing;

    public SocialPostAdminResponse present(SocialPost post) {
        SocialPostAdminResponse.Pillar pillar = pillars.all().stream().filter(candidate -> candidate.code().equals(post.pillarCode())).findFirst()
                .map(found -> new SocialPostAdminResponse.Pillar(found.code(), found.nameEs(), found.nameEn()))
                .orElse(new SocialPostAdminResponse.Pillar(post.pillarCode(), post.pillarCode(), post.pillarCode()));
        int year = post.scheduledFor().atZone(settings.zone()).getYear();
        SocialPostAdminResponse.WineDayRef wineDay = Objects.isNull(post.wineDayCode()) ? null : wineDays.all().stream()
                .filter(candidate -> candidate.code().equals(post.wineDayCode())).findFirst()
                .map(found -> new SocialPostAdminResponse.WineDayRef(found.code(), found.nameEs(), found.nameEn(), found.on(year)))
                .orElse(new SocialPostAdminResponse.WineDayRef(post.wineDayCode(), post.wineDayCode(), post.wineDayCode(), null));
        return new SocialPostAdminResponse(post.id(), post.status(), post.scheduledFor(), pillar, wineDay, copies(post.copies()),
                generation(post.generation()), review(post.review()), media(post.media()), publishing(post.publishing()),
                publications(post.id()), post.createdAt(), post.updatedAt(), post.canReschedule(),
                post.publishableNow() && publishing.publishesAny(), networkSchedule(post));
    }

    /**
     * Each network that publishes, in network order, with the time the post goes out on it; empty once publishing started,
     * when its publications show the real state (publish now skips the networks' later times).
     */
    private List<SocialPostAdminResponse.NetworkSchedule> networkSchedule(SocialPost post) {
        if (Objects.nonNull(post.publishing())) {
            return List.of();
        }
        return publishing.networks().stream().filter(publishing::publishes).map(network -> new SocialPostAdminResponse.NetworkSchedule(
                network, publishing.publishAt(network, post.scheduledFor()))).toList();
    }

    private static SocialPostAdminResponse.Publishing publishing(PostPublishing publishing) {
        return Objects.isNull(publishing) ? null
                : new SocialPostAdminResponse.Publishing(publishing.startedAt(), publishing.finishedAt(), publishing.error());
    }

    private List<SocialPostAdminResponse.Publication> publications(UUID postId) {
        List<SocialPublication> stored = publications.findByPost(postId);
        if (stored.isEmpty()) {
            return List.of();
        }
        Map<UUID, PublicationMetrics> latest = metrics.latestByPublication(stored.stream().map(SocialPublication::id).toList());
        return stored.stream().map(publication -> new SocialPostAdminResponse.Publication(publication.network(), publication.status(),
                publication.externalId(), publication.permalink(), publication.attempts(), publication.error(), publication.publishedAt(),
                metrics(latest.get(publication.id())))).toList();
    }

    private static SocialPostAdminResponse.Metrics metrics(PublicationMetrics metrics) {
        return Objects.isNull(metrics) ? null : new SocialPostAdminResponse.Metrics(metrics.views(), metrics.reach(), metrics.likes(),
                metrics.comments(), metrics.saves(), metrics.shares(), metrics.follows());
    }

    private static SocialPostAdminResponse.Copies copies(PostCopies copies) {
        return Objects.isNull(copies) ? new SocialPostAdminResponse.Copies(null, null)
                : new SocialPostAdminResponse.Copies(copy(copies.es()), copy(copies.en()));
    }

    private static SocialPostAdminResponse.Copy copy(PostCopy copy) {
        if (Objects.isNull(copy)) {
            return null;
        }
        return new SocialPostAdminResponse.Copy(copy.hook(),
                copy.slides().stream().map(slide -> new SocialPostAdminResponse.Slide(slide.title(), slide.body())).toList(),
                copy.caption(), copy.hashtags(), copy.altText(), copy.cta(), copy.illustration());
    }

    private static SocialPostAdminResponse.Media media(SocialPostMedia media) {
        if (Objects.isNull(media)) {
            return null;
        }
        SocialPostMedia.Illustration illustration = media.illustration();
        return new SocialPostAdminResponse.Media(media.status(), Objects.isNull(illustration) ? null : illustration.source(), media.error(),
                Objects.isNull(illustration) ? null : illustration.reason(),
                Objects.isNull(illustration) || Objects.isNull(illustration.image()) ? null : illustration.image().url(),
                new SocialPostAdminResponse.SlideSets(slideSet(media, PostLanguage.ES), slideSet(media, PostLanguage.EN)), media.updatedAt());
    }

    /** A language's slides: null when never rendered, empty lists while they show older copy of that language. */
    private static SocialPostAdminResponse.SlideSet slideSet(SocialPostMedia media, PostLanguage language) {
        SocialPostMedia.Slides latest = media.slides().get(language);
        if (Objects.isNull(latest)) {
            return null;
        }
        SocialPostMedia.Slides current = media.currentSlides(language);
        return new SocialPostAdminResponse.SlideSet(Objects.isNull(current) ? List.of() : urls(current.instagram()),
                Objects.isNull(current) ? List.of() : urls(current.tiktok()), latest.copyHash());
    }

    private static List<String> urls(List<SocialPostMedia.Image> images) {
        return images.stream().map(SocialPostMedia.Image::url).toList();
    }

    private static SocialPostAdminResponse.Generation generation(GenerationInfo generation) {
        return new SocialPostAdminResponse.Generation(generation.provider(), generation.model(), generation.mock(), generation.attempts(),
                generation.generatedAt(), generation.factCheck(), generation.factCheckIssues(), generation.error());
    }

    private SocialPostAdminResponse.Review review(PostReview review) {
        if (Objects.isNull(review)) {
            return null;
        }
        Map<UUID, String> emails = reviewers.emailsOf(Stream.of(review.reviewedBy(), review.editedBy()).filter(Objects::nonNull).distinct().toList());
        return new SocialPostAdminResponse.Review(review.reviewedBy(), emailOf(emails, review.reviewedBy()), review.reviewedAt(),
                review.reason(), review.editedBy(), emailOf(emails, review.editedBy()), review.isAutomatic());
    }

    private static String emailOf(Map<UUID, String> emails, UUID accountId) {
        return Objects.isNull(accountId) ? null : emails.get(accountId);
    }
}
