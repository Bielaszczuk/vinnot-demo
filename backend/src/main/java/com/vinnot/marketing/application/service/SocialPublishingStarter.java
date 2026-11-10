package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.model.PublishingSettings;
import com.vinnot.marketing.application.port.out.SocialPostRepository;
import com.vinnot.marketing.application.port.out.SocialPublicationRepository;
import com.vinnot.marketing.application.port.out.SocialPublishQueue;
import com.vinnot.marketing.application.port.out.SocialPublishingNotices;
import com.vinnot.marketing.domain.model.PublicationStatus;
import com.vinnot.marketing.domain.model.SocialNetwork;
import com.vinnot.marketing.domain.model.SocialPost;
import com.vinnot.marketing.domain.model.SocialPostStatus;
import com.vinnot.marketing.domain.model.SocialPublication;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Starts publishing one due approved post (#510 S2), in one transaction: the post is scheduled only over the approved status
 * it was read in, and gets one queued publication per enabled network, each queued as a durable effect. A publication the
 * post already has on a network (it started publishing before and was approved again) is reused instead of inserting a
 * duplicate: a queued one is queued again, a failed one is retried over its failed status, any other is left alone. A post whose media
 * is still not ready waits until the media grace after its slot ends, then fails with {@value #MEDIA_NOT_READY} and the
 * admins are told. Each network's publication is queued to run at that network's time (#513 S4: the post time, or its day's
 * not-before time when later); publishing now (#513 S6) queues every network at once.
 */
@Service
@RequiredArgsConstructor
public class SocialPublishingStarter {
    static final String MEDIA_NOT_READY = "MEDIA_NOT_READY";
    private final SocialPostRepository posts;
    private final SocialPublicationRepository publications;
    private final SocialPublishQueue queue;
    private final SocialPublishingNotices notices;
    private final PublishingSettings settings;

    /** What happened to a due post. */
    public enum Result { STARTED, WAITING_FOR_MEDIA, MEDIA_NOT_READY, SKIPPED }

    /** @return {@link Result#SKIPPED} when no network is enabled or the post changed since it was read */
    @Transactional
    public Result start(SocialPost post, Instant now) {
        return start(post, now, false);
    }

    /**
     * Starts a post the admin publishes now (#513 S6): like {@link #start}, but every network is queued at once, ignoring its
     * not-before time.
     */
    @Transactional
    public Result startNow(SocialPost post, Instant now) {
        return start(post, now, true);
    }

    private Result start(SocialPost post, Instant now, boolean immediately) {
        if (settings.networks().isEmpty()) {
            return Result.SKIPPED;
        }
        if (post.readyToPublish()) {
            post.startPublishing(now);
            if (!posts.saveIfStatus(post, SocialPostStatus.APPROVED)) {
                return Result.SKIPPED;
            }
            Map<SocialNetwork, SocialPublication> existing = publications.findByPost(post.id()).stream()
                    .collect(Collectors.toMap(SocialPublication::network, Function.identity()));
            for (SocialNetwork network : settings.networks()) {
                Duration delay = immediately ? Duration.ZERO : settings.delay(network, post.scheduledFor(), now);
                SocialPublication publication = existing.get(network);
                if (Objects.isNull(publication)) {
                    publication = SocialPublication.queued(UUID.randomUUID(), post.id(), network, now);
                    publications.save(publication);
                    queue.enqueue(publication.id(), delay);
                } else if (requeued(publication, now)) {
                    queue.enqueue(publication.id(), delay);
                }
            }
            return Result.STARTED;
        }
        if (!now.isAfter(post.scheduledFor().plus(settings.mediaGrace()))) {
            return Result.WAITING_FOR_MEDIA;
        }
        post.publishingFailed(MEDIA_NOT_READY, now);
        if (!posts.saveIfStatus(post, SocialPostStatus.APPROVED)) {
            return Result.SKIPPED;
        }
        notices.postFailed(post, null, MEDIA_NOT_READY);
        return Result.MEDIA_NOT_READY;
    }

    /** Whether an existing publication is queued to publish: already queued, or failed and moved back to queued by this call. */
    private boolean requeued(SocialPublication publication, Instant now) {
        if (publication.status() == PublicationStatus.QUEUED) {
            return true;
        }
        if (publication.status() != PublicationStatus.FAILED) {
            return false;
        }
        publication.retry(now);
        return publications.saveIfStatus(publication, PublicationStatus.FAILED);
    }
}
