package com.vinnot.marketing.application.port.out;

import com.vinnot.marketing.domain.model.SocialPost;
import com.vinnot.marketing.domain.model.SocialPostMedia;
import com.vinnot.marketing.domain.model.SocialPostStatus;
import com.vinnot.shared.domain.valueobject.PageResult;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** The {@code social_posts} table (#489). */
public interface SocialPostRepository {
    /**
     * Inserts a new post or updates an existing one. The stored media is replaced only when the post points it at another
     * copy hash or illustration version; otherwise the render job's latest media stays.
     */
    void save(SocialPost post);

    /**
     * Compare-and-set of a post's media (#492): writes {@code next} only while the stored media still equals
     * {@code expected} ({@code null} for none). False when the post is gone or its media changed meanwhile.
     */
    boolean saveMedia(UUID postId, SocialPostMedia expected, SocialPostMedia next);

    /**
     * Compare-and-set of an approval by the system (#510): writes the post's status and review only while the stored post
     * is still pending approval, last updated at {@code expectedUpdatedAt} and with the media {@code expectedMedia}
     * ({@code null} for none). False when it is gone or anyone (an admin, the copy or render job) changed it meanwhile.
     */
    boolean saveApprovalIfUnchanged(SocialPost post, Instant expectedUpdatedAt, SocialPostMedia expectedMedia);

    /**
     * {@link #save} only while the stored post is still in {@code expected} status (#510) and still at the post's
     * {@code scheduledFor} (#513): publishing and the admin never overwrite each other's status change or reschedule made
     * after they read the post. False when the stored post's status or time changed meanwhile; then nothing is written. Like
     * {@link #save} it is an upsert, so a post that is not stored (no path deletes posts) is inserted and the call returns
     * true. Neither save moves a stored post's time: only {@link #saveScheduleIfUnchanged} does.
     */
    boolean saveIfStatus(SocialPost post, SocialPostStatus expected);

    /**
     * Writes a stored post's new time and its {@code updatedAt} (#513 S5/S6) only while it is still in {@code expectedStatus}
     * at {@code expectedScheduledFor}, the status and time the caller read, so a reschedule or a publish-now never races the
     * publishing sweep. False when the post is gone or either changed meanwhile; then nothing is written.
     */
    boolean saveScheduleIfUnchanged(SocialPost post, SocialPostStatus expectedStatus, Instant expectedScheduledFor);

    /**
     * Up to {@code limit} approved posts whose slot is after {@code after} and at or before {@code now}, earliest first: the
     * posts due to publish (#510). Older approved posts are never returned, so switching publishing on never publishes them.
     */
    List<SocialPost> findDueForPublishing(Instant after, Instant now, int limit);

    /** Up to {@code limit} posts with copy, slotted from {@code from} on, whose media was never rendered or is pending. */
    List<SocialPost> findAwaitingMedia(Instant from, int limit);

    Optional<SocialPost> findById(UUID id);

    /** Posts whose slot is inside {@code from}..{@code to} (inclusive), earliest first. */
    List<SocialPost> findScheduledBetween(Instant from, Instant to);

    /** Up to {@code limit} posts in the status, earliest slot first. */
    List<SocialPost> findByStatus(SocialPostStatus status, int limit);

    /** Pages the queue by slot ascending; every filter may be null. */
    PageResult<SocialPost> search(SocialPostStatus status, Instant from, Instant to, int page, int size);
}
