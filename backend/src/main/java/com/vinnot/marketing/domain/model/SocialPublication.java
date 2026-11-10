package com.vinnot.marketing.domain.model;

import com.vinnot.marketing.domain.exception.InvalidPublicationTransitionException;

import java.time.Instant;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * One post's publication on one network (#510): queued, being published, published (or sent to the TikTok inbox as a
 * draft) or failed. A transient failure queues it again and keeps the error; the admin may queue a failed one again. A
 * TikTok draft the creator then posts from the app becomes published (#516). Every transition is a rule here.
 */
public final class SocialPublication {
    private final UUID id;
    private final UUID postId;
    private final SocialNetwork network;
    private final Instant createdAt;
    private PublicationStatus status;
    private String externalId;
    private String permalink;
    private int attempts;
    private String error;
    private Instant updatedAt;
    private Instant publishedAt;

    private SocialPublication(UUID id, UUID postId, SocialNetwork network, PublicationStatus status, String externalId, String permalink,
            int attempts, String error, Instant createdAt, Instant updatedAt, Instant publishedAt) {
        this.id = Objects.requireNonNull(id, "id");
        this.postId = Objects.requireNonNull(postId, "postId");
        this.network = Objects.requireNonNull(network, "network");
        this.status = Objects.requireNonNull(status, "status");
        if (attempts < 0) {
            throw new IllegalArgumentException("Attempts cannot be negative, got " + attempts);
        }
        this.externalId = externalId;
        this.permalink = permalink;
        this.attempts = attempts;
        this.error = error;
        this.createdAt = Objects.requireNonNull(createdAt, "createdAt");
        this.updatedAt = Objects.requireNonNull(updatedAt, "updatedAt");
        this.publishedAt = publishedAt;
    }

    /** A new publication waiting for its first attempt. */
    public static SocialPublication queued(UUID id, UUID postId, SocialNetwork network, Instant now) {
        return new SocialPublication(id, postId, network, PublicationStatus.QUEUED, null, null, 0, null, now, now, null);
    }

    /** A stored publication, as persistence read it. */
    public static SocialPublication restore(UUID id, UUID postId, SocialNetwork network, PublicationStatus status, String externalId,
            String permalink, int attempts, String error, Instant createdAt, Instant updatedAt, Instant publishedAt) {
        return new SocialPublication(id, postId, network, status, externalId, permalink, attempts, error, createdAt, updatedAt,
                publishedAt);
    }

    /** An attempt starts. */
    public void started(Instant now) {
        require(Set.of(PublicationStatus.QUEUED), "start");
        this.status = PublicationStatus.PUBLISHING;
        this.attempts++;
        this.updatedAt = now;
    }

    /** The network published the post; the permalink may be unknown. */
    public void published(String externalId, String permalink, Instant now) {
        require(Set.of(PublicationStatus.PUBLISHING), "mark as published");
        succeeded(PublicationStatus.PUBLISHED, externalId, permalink, now);
    }

    /** TikTok received the post as a draft in the creator's inbox. */
    public void draftSent(String externalId, Instant now) {
        require(Set.of(PublicationStatus.PUBLISHING), "mark as draft sent");
        succeeded(PublicationStatus.DRAFT_SENT, externalId, null, now);
    }

    /**
     * The creator posted the TikTok inbox draft from the app (#516): it is published, keeping TikTok's {@code publish_id}
     * as its network id, from now on. The public link is known only once TikTok moderated a public post, so it may be null.
     */
    public void draftPosted(String permalink, Instant now) {
        require(Set.of(PublicationStatus.DRAFT_SENT), "mark a draft as posted");
        this.status = PublicationStatus.PUBLISHED;
        this.permalink = permalink;
        this.publishedAt = now;
        this.updatedAt = now;
    }

    private void succeeded(PublicationStatus next, String networkId, String link, Instant now) {
        this.externalId = Objects.requireNonNull(networkId, "externalId");
        this.permalink = link;
        this.status = next;
        this.error = null;
        this.publishedAt = now;
        this.updatedAt = now;
    }

    /** It failed for good, before or during an attempt. */
    public void failed(String errorCode, Instant now) {
        require(Set.of(PublicationStatus.QUEUED, PublicationStatus.PUBLISHING), "fail");
        this.error = Objects.requireNonNull(errorCode, "errorCode");
        this.status = PublicationStatus.FAILED;
        this.updatedAt = now;
    }

    /** A transient failure: queued for another attempt, keeping the error for the admin. */
    public void retryLater(String errorCode, Instant now) {
        require(Set.of(PublicationStatus.PUBLISHING), "retry later");
        this.error = Objects.requireNonNull(errorCode, "errorCode");
        this.status = PublicationStatus.QUEUED;
        this.updatedAt = now;
    }

    /**
     * The admin retries a failed publication: queued again, without its error, and its attempts start over so the attempt
     * cap applies to the retry as to the first run.
     */
    public void retry(Instant now) {
        require(Set.of(PublicationStatus.FAILED), "retry");
        this.error = null;
        this.attempts = 0;
        this.status = PublicationStatus.QUEUED;
        this.updatedAt = now;
    }

    private void require(Set<PublicationStatus> allowed, String action) {
        if (!allowed.contains(status)) {
            throw new InvalidPublicationTransitionException(status, action);
        }
    }

    public UUID id() {
        return id;
    }

    public UUID postId() {
        return postId;
    }

    public SocialNetwork network() {
        return network;
    }

    public PublicationStatus status() {
        return status;
    }

    /** The network's id of the published post or draft; null until it succeeded. */
    public String externalId() {
        return externalId;
    }

    /** The public link of the published post; null for drafts and when the network did not give one. */
    public String permalink() {
        return permalink;
    }

    public int attempts() {
        return attempts;
    }

    /** The last error code, kept while it is retried and when it failed. */
    public String error() {
        return error;
    }

    public Instant createdAt() {
        return createdAt;
    }

    public Instant updatedAt() {
        return updatedAt;
    }

    /** When it was published or sent as a draft (for a posted draft, when the sweep saw it posted); null before. */
    public Instant publishedAt() {
        return publishedAt;
    }
}
