package com.vinnot.marketing.application.port.out;

import com.vinnot.marketing.domain.model.PublicationStatus;
import com.vinnot.marketing.domain.model.SocialPublication;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** The {@code social_publications} table (#510): one publication per post and network. */
public interface SocialPublicationRepository {

    /** Inserts a new publication or updates the stored one with the same id. */
    void save(SocialPublication publication);

    /**
     * Updates the stored publication only while it is still in {@code expected} status (#510), so two concurrent retries
     * never queue it twice. False when it is gone or its status changed meanwhile; then nothing is written.
     */
    boolean saveIfStatus(SocialPublication publication, PublicationStatus expected);

    Optional<SocialPublication> findById(UUID id);

    /** The post's publications, in network order. */
    List<SocialPublication> findByPost(UUID postId);

    /**
     * Atomically moves a queued publication to publishing and counts the attempt, so two workers never publish it twice.
     * False when it is gone or not queued.
     */
    boolean claim(UUID id, Instant now);

    /** Publications published or sent as a draft from {@code since} on that have a network id, for reading their metrics. */
    List<SocialPublication> findSucceededSince(Instant since);

    /**
     * Drafts still in the creator's inbox ({@code DRAFT_SENT}) sent from {@code since} on that have a network id (#516),
     * oldest first, at most {@code limit}.
     */
    List<SocialPublication> findDraftsSentSince(Instant since, int limit);
}
