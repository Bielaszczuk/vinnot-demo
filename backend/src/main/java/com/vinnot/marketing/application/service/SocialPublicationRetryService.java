package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.exception.SocialPublishingOffException;
import com.vinnot.marketing.application.model.PublishingSettings;
import com.vinnot.marketing.application.model.SocialPostAdminResponse;
import com.vinnot.marketing.application.port.in.RetrySocialPublicationUseCase;
import com.vinnot.marketing.application.port.out.SocialPostRepository;
import com.vinnot.marketing.application.port.out.SocialPublicationRepository;
import com.vinnot.marketing.application.port.out.SocialPublishQueue;
import com.vinnot.marketing.domain.exception.InvalidPostTransitionException;
import com.vinnot.marketing.domain.exception.InvalidPublicationTransitionException;
import com.vinnot.marketing.domain.model.PublicationStatus;
import com.vinnot.marketing.domain.model.SocialNetwork;
import com.vinnot.marketing.domain.model.SocialPost;
import com.vinnot.marketing.domain.model.SocialPostStatus;
import com.vinnot.marketing.domain.model.SocialPublication;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/**
 * The admin retries a failed publication (#510 S3), in one transaction: only a failed publication may be retried (its
 * attempts start over), a failed post starts publishing again (which needs ready media) over the status it was read in,
 * and the publication is moved back to queued only over its failed status, so of two concurrent retries only one queues
 * it as a durable effect and the other conflicts. While publishing or the publication's network is switched off a retry
 * conflicts and changes nothing.
 */
@Service
@RequiredArgsConstructor
public class SocialPublicationRetryService implements RetrySocialPublicationUseCase {
    private final SocialPostRepository posts;
    private final SocialPublicationRepository publications;
    private final SocialPublishQueue queue;
    private final SocialPostPresenter presenter;
    private final PublishingSettings settings;

    @Override
    @Transactional
    public SocialPostAdminResponse retry(UUID postId, SocialNetwork network, Instant now) {
        if (!settings.publishes(network)) {
            throw new SocialPublishingOffException(network);
        }
        SocialPost post = posts.findById(postId).orElseThrow(() -> new EntityNotFoundException("SocialPost", postId));
        SocialPublication publication = publications.findByPost(postId).stream().filter(candidate -> candidate.network() == network)
                .findFirst().orElseThrow(() -> new EntityNotFoundException("SocialPublication", postId + "/" + network));
        publication.retry(now);
        if (post.status() == SocialPostStatus.FAILED) {
            post.retryPublishing(now);
            if (!posts.saveIfStatus(post, SocialPostStatus.FAILED)) {
                throw new InvalidPostTransitionException(SocialPostStatus.FAILED, "retry publishing a changed");
            }
        }
        if (!publications.saveIfStatus(publication, PublicationStatus.FAILED)) {
            throw new InvalidPublicationTransitionException(PublicationStatus.FAILED, "retry a changed");
        }
        queue.enqueue(publication.id());
        return presenter.present(post);
    }
}
