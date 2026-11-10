package com.vinnot.marketing.domain.model;

import com.vinnot.marketing.domain.exception.InvalidPostCopyException;
import com.vinnot.marketing.domain.exception.InvalidPostTransitionException;
import com.vinnot.marketing.domain.exception.SocialPostMediaNotReadyException;
import com.vinnot.marketing.domain.exception.SocialPostScheduleNotFutureException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * One post of the approval queue (#489). The planner creates it as a draft on its slot; copy generation moves it to
 * pending approval, only with copy in every language (#497); the owner approves, rejects, edits one language or
 * regenerates it. Every transition is a rule here. New copy and a "new illustration" request point the media (#492) at
 * what must be rendered next. An approved post with ready Spanish media starts publishing (#510): it is scheduled, then
 * published or failed, and its media is frozen from then on so published images are never replaced; a failed post may
 * render again and be retried. A pending post may also be approved by the system on its pillar's behalf. Until publishing
 * starts the admin may move a post to another future time, keeping its status, and publish an approved post with ready media
 * now (#513); both keep the time to the second.
 */
public final class SocialPost {
    private static final Set<SocialPostStatus> GENERATABLE = Set.of(SocialPostStatus.DRAFT, SocialPostStatus.PENDING_APPROVAL,
            SocialPostStatus.REJECTED, SocialPostStatus.APPROVED);
    private static final Set<SocialPostStatus> REGENERABLE = Set.of(SocialPostStatus.PENDING_APPROVAL, SocialPostStatus.REJECTED,
            SocialPostStatus.APPROVED);
    private static final Set<SocialPostStatus> REJECTABLE = Set.of(SocialPostStatus.PENDING_APPROVAL, SocialPostStatus.APPROVED);
    /** Publishing has not started: the admin may still move the post (#513). */
    private static final Set<SocialPostStatus> RESCHEDULABLE = Set.of(SocialPostStatus.DRAFT, SocialPostStatus.PENDING_APPROVAL,
            SocialPostStatus.APPROVED, SocialPostStatus.REJECTED);
    /** Publishing started or ended: the media must stay as it was published. */
    private static final Set<SocialPostStatus> MEDIA_FROZEN = Set.of(SocialPostStatus.SCHEDULED, SocialPostStatus.PUBLISHED);
    private static final String NOT_READY = "start publishing without ready media for";

    private final UUID id;
    private Instant scheduledFor;
    private final String pillarCode;
    private final String wineDayCode;
    private final Instant createdAt;
    private SocialPostStatus status;
    private PostCopies copies;
    private GenerationInfo generation;
    private PostReview review;
    private SocialPostMedia media;
    private PostPublishing publishing;
    private Instant updatedAt;

    private SocialPost(UUID id, SocialPostStatus status, Instant scheduledFor, String pillarCode, String wineDayCode, PostCopies copies,
            GenerationInfo generation, PostReview review, SocialPostMedia media, PostPublishing publishing, Instant createdAt,
            Instant updatedAt) {
        this.id = Objects.requireNonNull(id, "id");
        this.status = Objects.requireNonNull(status, "status");
        this.scheduledFor = Objects.requireNonNull(scheduledFor, "scheduledFor");
        this.pillarCode = Objects.requireNonNull(pillarCode, "pillarCode");
        this.wineDayCode = wineDayCode;
        this.copies = copies;
        this.generation = Objects.requireNonNull(generation, "generation");
        this.review = review;
        this.media = media;
        this.publishing = publishing;
        this.createdAt = Objects.requireNonNull(createdAt, "createdAt");
        this.updatedAt = Objects.requireNonNull(updatedAt, "updatedAt");
    }

    /** A new draft on its slot, waiting for copy. */
    public static SocialPost planned(UUID id, Instant scheduledFor, String pillarCode, String wineDayCode, Instant now) {
        return new SocialPost(id, SocialPostStatus.DRAFT, scheduledFor, pillarCode, wineDayCode, null, GenerationInfo.none(), null,
                null, null, now, now);
    }

    /**
     * A stored post, as persistence read it; posts stored before #492 have no media and posts stored before #497 have
     * Spanish copy only.
     */
    public static SocialPost restore(UUID id, SocialPostStatus status, Instant scheduledFor, String pillarCode, String wineDayCode,
            PostCopies copies, GenerationInfo generation, PostReview review, SocialPostMedia media, PostPublishing publishing,
            Instant createdAt, Instant updatedAt) {
        return new SocialPost(id, status, scheduledFor, pillarCode, wineDayCode, copies, generation, review, media, publishing, createdAt,
                updatedAt);
    }

    /** A stored post that never started publishing (#510), as posts stored before publishing existed. */
    public static SocialPost restore(UUID id, SocialPostStatus status, Instant scheduledFor, String pillarCode, String wineDayCode,
            PostCopies copies, GenerationInfo generation, PostReview review, SocialPostMedia media, Instant createdAt, Instant updatedAt) {
        return restore(id, status, scheduledFor, pillarCode, wineDayCode, copies, generation, review, media, null, createdAt, updatedAt);
    }

    /**
     * New copy arrived, from a first generation or a regeneration: the post waits for approval with no review, so a
     * regenerated approved post loses its approval (#497). It must hold every language, so a post never waits for approval
     * with a language missing.
     */
    public void copyGenerated(PostCopies copies, GenerationInfo generation, Instant now) {
        require(GENERATABLE, "generate copy for");
        Objects.requireNonNull(copies, "copies");
        if (!copies.complete()) {
            throw new InvalidPostCopyException("generated copy must hold every language");
        }
        this.copies = copies;
        this.generation = Objects.requireNonNull(generation, "generation");
        this.review = null;
        this.status = SocialPostStatus.PENDING_APPROVAL;
        this.media = mediaFor(copies, now);
        this.updatedAt = now;
    }

    /**
     * The provider failed: the status, the review and the previous copy stay (an approved post stays approved), the error
     * is kept for the admin and the retry.
     */
    public void generationFailed(GenerationInfo generation, Instant now) {
        require(GENERATABLE, "generate copy for");
        this.generation = Objects.requireNonNull(generation, "generation");
        this.updatedAt = now;
    }

    public void approve(UUID reviewer, Instant now) {
        require(Set.of(SocialPostStatus.PENDING_APPROVAL), "approve");
        this.review = new PostReview(Objects.requireNonNull(reviewer, "reviewer"), now, null, null);
        this.status = SocialPostStatus.APPROVED;
        this.updatedAt = now;
    }

    /** The system approves a pending post on its pillar's behalf (#510): no reviewer, reason {@link PostReview#AUTO_APPROVED}. */
    public void autoApprove(Instant now) {
        require(Set.of(SocialPostStatus.PENDING_APPROVAL), "auto-approve");
        this.review = PostReview.automatic(now);
        this.status = SocialPostStatus.APPROVED;
        this.updatedAt = now;
    }

    public void reject(UUID reviewer, String reason, Instant now) {
        require(REJECTABLE, "reject");
        this.review = new PostReview(Objects.requireNonNull(reviewer, "reviewer"), now, blankToNull(reason), null);
        this.status = SocialPostStatus.REJECTED;
        this.updatedAt = now;
    }

    /**
     * Replaces the copy of one language and leaves the other as it is; a pending post stays pending and an approved one
     * goes back to the queue. The editor does not write the illustration subject, so the shared one stays unless the new
     * copy brings its own, which then becomes every language's subject.
     */
    public void edit(PostLanguage language, PostCopy copy, UUID editor, Instant now) {
        require(Set.of(SocialPostStatus.PENDING_APPROVAL, SocialPostStatus.APPROVED), "edit");
        Objects.requireNonNull(language, "language");
        Objects.requireNonNull(copy, "copy");
        PostCopies edited = Objects.isNull(copies) ? PostCopies.only(language, copy) : copies.with(language, copy);
        this.copies = edited.withIllustration(Objects.nonNull(copy.illustration()) ? copy.illustration()
                : Objects.isNull(copies) ? null : copies.illustration());
        this.media = mediaFor(this.copies, now);
        this.review = Objects.isNull(review) ? new PostReview(null, null, null, editor) : review.edited(editor);
        this.status = SocialPostStatus.PENDING_APPROVAL;
        this.updatedAt = now;
    }

    /**
     * The admin wants another hero image: allowed while the post has copy and its publishing has not started or failed
     * (#510: a scheduled or published post keeps the images it was published with). Its status stays.
     */
    public void requestNewIllustration(Instant now) {
        if (Objects.isNull(copies) || MEDIA_FROZEN.contains(status)) {
            throw new InvalidPostTransitionException(status, "request a new illustration for");
        }
        SocialPostMedia current = Objects.isNull(media) ? SocialPostMedia.pending(copies.mediaHashes(), 0, now) : media;
        this.media = current.newIllustration(now);
    }

    /**
     * Whether the post has media to render (copy, publishing not started, or failed so the admin can fix its media and
     * retry, #510). A post stored before #492 gets its first media target here.
     */
    public boolean prepareMedia(Instant now) {
        if (Objects.isNull(copies) || MEDIA_FROZEN.contains(status)) {
            return false;
        }
        if (Objects.isNull(media)) {
            this.media = SocialPostMedia.pending(copies.mediaHashes(), 1, now);
        }
        return true;
    }

    private SocialPostMedia mediaFor(PostCopies next, Instant now) {
        return Objects.isNull(media) ? SocialPostMedia.pending(next.mediaHashes(), 1, now) : media.forCopy(next.mediaHashes(), now);
    }

    /**
     * Whether the Spanish media is ready to publish (#510): rendered for the current target, with the Spanish slides of the
     * current Spanish copy in both formats (Instagram slides for Instagram, Facebook and Threads, TikTok slides for TikTok).
     */
    public boolean readyToPublish() {
        if (Objects.isNull(media) || media.status() != SocialPostMedia.Status.READY) {
            return false;
        }
        SocialPostMedia.Slides spanish = media.currentSlides(PostLanguage.ES);
        return Objects.nonNull(spanish) && !spanish.instagram().isEmpty() && !spanish.tiktok().isEmpty();
    }

    /** An approved post whose slot arrived starts publishing (#510); its media must be ready and is frozen from now on. */
    public void startPublishing(Instant now) {
        require(Set.of(SocialPostStatus.APPROVED), "start publishing");
        schedule(now);
    }

    /** Whether the admin may still move the post (#513 S5): its publishing has not started. */
    public boolean canReschedule() {
        return RESCHEDULABLE.contains(status);
    }

    /**
     * The admin moves a post whose publishing has not started to another time, kept to the second (#513 S5); its status, copy
     * and media stay. The time must be after {@code now}. Whether another post goes out that date is the caller's check.
     */
    public void reschedule(Instant to, Instant now) {
        require(RESCHEDULABLE, "reschedule");
        Instant next = Objects.requireNonNull(to, "to").truncatedTo(ChronoUnit.SECONDS);
        if (!next.isAfter(now)) {
            throw new SocialPostScheduleNotFutureException(to);
        }
        this.scheduledFor = next;
        this.updatedAt = now;
    }

    /** Whether an approved post may be published now (#513 S6): its media is ready to publish. */
    public boolean publishableNow() {
        return status == SocialPostStatus.APPROVED && readyToPublish();
    }

    /**
     * The admin publishes an approved post with ready media now (#513 S6): its time moves to now, kept to the second, and the
     * caller starts its publishing at once ({@link #startPublishing}).
     */
    public void publishNow(Instant now) {
        require(Set.of(SocialPostStatus.APPROVED), "publish now");
        if (!readyToPublish()) {
            throw new SocialPostMediaNotReadyException();
        }
        this.scheduledFor = now.truncatedTo(ChronoUnit.SECONDS);
        this.updatedAt = now;
    }

    /** Every enabled network succeeded (a TikTok draft counts). */
    public void publishingSucceeded(Instant now) {
        require(Set.of(SocialPostStatus.SCHEDULED), "mark as published");
        this.publishing = new PostPublishing(Objects.isNull(publishing) ? null : publishing.startedAt(), now, null);
        this.status = SocialPostStatus.PUBLISHED;
        this.updatedAt = now;
    }

    /**
     * A network failed for good, or an approved post's media never got ready: the post fails with the error code. An
     * approved post fails without having started.
     */
    public void publishingFailed(String errorCode, Instant now) {
        require(Set.of(SocialPostStatus.APPROVED, SocialPostStatus.SCHEDULED), "fail publishing");
        Objects.requireNonNull(errorCode, "errorCode");
        this.publishing = new PostPublishing(Objects.isNull(publishing) ? null : publishing.startedAt(), now, errorCode);
        this.status = SocialPostStatus.FAILED;
        this.updatedAt = now;
    }

    /** The admin retries a failed post: publishing starts again, which needs ready media like the first start. */
    public void retryPublishing(Instant now) {
        require(Set.of(SocialPostStatus.FAILED), "retry publishing");
        schedule(now);
    }

    private void schedule(Instant now) {
        if (!readyToPublish()) {
            throw new InvalidPostTransitionException(status, NOT_READY);
        }
        this.publishing = new PostPublishing(now, null, null);
        this.status = SocialPostStatus.SCHEDULED;
        this.updatedAt = now;
    }

    /**
     * Regeneration is an admin action on a pending, rejected or approved post (#497: an approved one goes back to pending
     * with its new copy); scheduled, published and failed posts cannot be regenerated.
     */
    public void requireRegenerable() {
        require(REGENERABLE, "regenerate");
    }

    private void require(Set<SocialPostStatus> allowed, String action) {
        if (!allowed.contains(status)) {
            throw new InvalidPostTransitionException(status, action);
        }
    }

    private static String blankToNull(String value) {
        return Objects.isNull(value) || value.isBlank() ? null : value.strip();
    }

    public UUID id() {
        return id;
    }

    public SocialPostStatus status() {
        return status;
    }

    public Instant scheduledFor() {
        return scheduledFor;
    }

    public String pillarCode() {
        return pillarCode;
    }

    public String wineDayCode() {
        return wineDayCode;
    }

    /** The copy in each language; null while the post is a draft without copy. */
    public PostCopies copies() {
        return copies;
    }

    public GenerationInfo generation() {
        return generation;
    }

    public PostReview review() {
        return review;
    }

    /** The rendered images and what is still to render; null until the post has copy (or for posts stored before #492). */
    public SocialPostMedia media() {
        return media;
    }

    /** When publishing started and ended and why it failed; null until it starts (or fails without starting). */
    public PostPublishing publishing() {
        return publishing;
    }

    public Instant createdAt() {
        return createdAt;
    }

    public Instant updatedAt() {
        return updatedAt;
    }
}
