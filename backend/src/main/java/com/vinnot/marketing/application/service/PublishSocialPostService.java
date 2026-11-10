package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.exception.SocialPublishingException;
import com.vinnot.marketing.application.model.NetworkCaption;
import com.vinnot.marketing.application.model.PublishingSettings;
import com.vinnot.marketing.application.model.PublishRequest;
import com.vinnot.marketing.application.model.PublishResult;
import com.vinnot.marketing.application.port.in.PublishSocialPostUseCase;
import com.vinnot.marketing.application.port.out.SocialPostRepository;
import com.vinnot.marketing.application.port.out.SocialPublicationRepository;
import com.vinnot.marketing.application.port.out.SocialPublisher;
import com.vinnot.marketing.application.port.out.SocialPublishingNotices;
import com.vinnot.marketing.domain.model.PostCopy;
import com.vinnot.marketing.domain.model.PostLanguage;
import com.vinnot.marketing.domain.model.PublicationStatus;
import com.vinnot.marketing.domain.model.SocialNetwork;
import com.vinnot.marketing.domain.model.SocialPost;
import com.vinnot.marketing.domain.model.SocialPostMedia;
import com.vinnot.marketing.domain.model.SocialPostStatus;
import com.vinnot.marketing.domain.model.SocialPublication;
import com.vinnot.marketing.domain.service.NetworkCaptionFormatter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URISyntaxException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Publishes one queued publication (#510 S2/S3/S4), outside any transaction because networks are slow. The atomic claim
 * (queued to publishing) runs first, so a duplicate effect or a second worker finds nothing to do and a post is never
 * published twice on a network. The request carries the Spanish copy formatted for the network and the Spanish slides
 * (TikTok slides for TikTok, Instagram slides for the others), every URL absolute https. A transient failure queues the
 * publication again and is rethrown so the outbox retries it, up to {@value #MAX_ATTEMPTS} attempts; any other failure,
 * or the last attempt, fails it for good. Once every publication of the post is done the post is settled: published when
 * all succeeded (a TikTok draft counts), failed with the first failure otherwise, written only over the scheduled status so
 * a concurrent settle or admin action is never overwritten and the admins hear about a failure once. While publishing or
 * the publication's network is switched off, a claimed publication (queued before, or retried by the outbox) fails for good
 * with {@value #PUBLISHING_OFF} without calling the network, so the admin can retry it once it is switched on again.
 */
@Service
public class PublishSocialPostService implements PublishSocialPostUseCase {
    /** Attempts of one publication before a transient failure counts as final; below the outbox's own limit. */
    static final int MAX_ATTEMPTS = 5;
    static final String POST_NOT_SCHEDULED = "POST_NOT_SCHEDULED";
    static final String MEDIA_NOT_READY = "MEDIA_NOT_READY";
    static final String PUBLISHING_OFF = "PUBLISHING_OFF";
    private static final String HTTPS = "https";
    private static final Logger LOGGER = LoggerFactory.getLogger(PublishSocialPostService.class);
    private final SocialPublicationRepository publications;
    private final SocialPostRepository posts;
    private final Map<SocialNetwork, SocialPublisher> publishers;
    private final SocialPublishingNotices notices;
    private final PublishingSettings settings;
    private final NetworkCaptionFormatter captions = new NetworkCaptionFormatter();

    public PublishSocialPostService(SocialPublicationRepository publications, SocialPostRepository posts, List<SocialPublisher> publishers,
            SocialPublishingNotices notices, PublishingSettings settings) {
        this.publications = publications;
        this.posts = posts;
        this.publishers = publishers.stream().collect(Collectors.toMap(SocialPublisher::network, Function.identity()));
        this.notices = notices;
        this.settings = settings;
    }

    @Override
    public void publish(UUID publicationId, Instant now) {
        if (!publications.claim(publicationId, now)) {
            LOGGER.info("Social publication {} is not queued any more; nothing to publish", publicationId);
            return;
        }
        Optional<SocialPublication> claimed = publications.findById(publicationId);
        if (claimed.isEmpty()) {
            return;
        }
        SocialPublication publication = claimed.get();
        if (!settings.publishes(publication.network())) {
            LOGGER.warn("Social publication {} on {} not published: publishing or the network is switched off", publication.id(),
                    publication.network());
            fail(publication, PUBLISHING_OFF, now);
            return;
        }
        Optional<SocialPost> found = posts.findById(publication.postId());
        if (found.isEmpty() || found.get().status() != SocialPostStatus.SCHEDULED) {
            publication.failed(POST_NOT_SCHEDULED, now);
            publications.save(publication);
            return;
        }
        SocialPost post = found.get();
        if (!post.readyToPublish()) {
            fail(publication, MEDIA_NOT_READY, now);
            return;
        }
        PublishResult result;
        try {
            result = publisherFor(publication.network()).publish(request(post, publication.network()));
        } catch (SocialPublishingException failure) {
            failed(publication, failure, now);
            return;
        } catch (RuntimeException unexpected) {
            failed(publication, new SocialPublishingException(SocialPublishingException.Code.UNAVAILABLE,
                    unexpected.getClass().getSimpleName(), unexpected), now);
            return;
        }
        if (result.outcome() == PublishResult.Outcome.DRAFT_SENT) {
            publication.draftSent(result.externalId(), now);
        } else {
            publication.published(result.externalId(), result.permalink(), now);
        }
        publications.save(publication);
        if (publication.status() == PublicationStatus.DRAFT_SENT) {
            notices.tiktokDraftWaiting(post);
        }
        settle(post.id(), now);
    }

    private SocialPublisher publisherFor(SocialNetwork network) {
        SocialPublisher publisher = publishers.get(network);
        if (Objects.isNull(publisher)) {
            throw new SocialPublishingException(SocialPublishingException.Code.NOT_CONNECTED, "no publisher for " + network);
        }
        return publisher;
    }

    private PublishRequest request(SocialPost post, SocialNetwork network) {
        PostCopy copy = post.copies().es();
        SocialPostMedia.Slides slides = post.media().currentSlides(PostLanguage.ES);
        List<String> urls = (network == SocialNetwork.TIKTOK ? slides.tiktok() : slides.instagram()).stream()
                .map(SocialPostMedia.Image::url).toList();
        if (!urls.stream().allMatch(PublishSocialPostService::isPublic)) {
            throw new SocialPublishingException(SocialPublishingException.Code.MEDIA_NOT_PUBLIC, "a slide URL is not absolute https");
        }
        NetworkCaptionFormatter.Caption caption = captions.format(network, copy, PostLanguage.ES);
        return new PublishRequest(post.id(), network, urls, copy.altText(),
                new NetworkCaption(caption.text(), caption.title(), caption.hashtags(), caption.topicTag()));
    }

    /** An absolute https URL with a host: what the networks fetch the images from. */
    private static boolean isPublic(String url) {
        try {
            URI uri = new URI(url);
            return HTTPS.equalsIgnoreCase(uri.getScheme()) && Objects.nonNull(uri.getHost());
        } catch (URISyntaxException invalid) {
            return false;
        }
    }

    private void failed(SocialPublication publication, SocialPublishingException failure, Instant now) {
        String code = failure.code().name();
        if (failure.retryable() && publication.attempts() < MAX_ATTEMPTS) {
            LOGGER.warn("Social publication {} on {} failed on attempt {} with {}; it will be retried", publication.id(),
                    publication.network(), publication.attempts(), code);
            publication.retryLater(code, now);
            publications.save(publication);
            throw failure;
        }
        LOGGER.warn("Social publication {} on {} failed for good on attempt {} with {}: {}", publication.id(), publication.network(),
                publication.attempts(), code, failure.detail());
        fail(publication, code, now);
    }

    private void fail(SocialPublication publication, String code, Instant now) {
        publication.failed(code, now);
        publications.save(publication);
        settle(publication.postId(), now);
    }

    /** Settles the post once every publication is done; only the settle that changes the scheduled post tells the admins. */
    private void settle(UUID postId, Instant now) {
        List<SocialPublication> all = publications.findByPost(postId);
        if (!all.stream().allMatch(publication -> publication.status().terminal())) {
            return;
        }
        Optional<SocialPost> found = posts.findById(postId);
        if (found.isEmpty() || found.get().status() != SocialPostStatus.SCHEDULED) {
            return;
        }
        SocialPost post = found.get();
        Optional<SocialPublication> failure = all.stream().filter(publication -> publication.status() == PublicationStatus.FAILED)
                .findFirst();
        if (failure.isEmpty()) {
            post.publishingSucceeded(now);
            posts.saveIfStatus(post, SocialPostStatus.SCHEDULED);
            return;
        }
        post.publishingFailed(failure.get().error(), now);
        if (posts.saveIfStatus(post, SocialPostStatus.SCHEDULED)) {
            notices.postFailed(post, failure.get().network(), failure.get().error());
        }
    }
}
