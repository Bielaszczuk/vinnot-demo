package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.model.PlannedBatch;
import com.vinnot.marketing.application.port.in.GeneratePlannedCopyUseCase;
import com.vinnot.marketing.application.port.in.GenerateSocialCopyUseCase;
import com.vinnot.marketing.application.port.out.SocialPostRepository;
import com.vinnot.marketing.domain.model.SocialPost;
import com.vinnot.marketing.domain.model.SocialPostStatus;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * The background half of a planner run (#489). Only drafts get copy, so a retried job never rewrites a post an admin
 * may already be reviewing; the notice counts every post of the batch that waits for approval and is deduplicated per
 * window and admin. A post that cannot be written (deleted meanwhile, unknown pillar) is logged and skipped, so it
 * never holds back the rest of the batch; the copy retry job tries it again if it is still a draft.
 */
@Service
@RequiredArgsConstructor
public class PlannedCopyService implements GeneratePlannedCopyUseCase {
    private static final Logger LOGGER = LoggerFactory.getLogger(PlannedCopyService.class);
    private final SocialPostRepository posts;
    private final GenerateSocialCopyUseCase copy;
    private final SocialBatchNoticeService notice;

    @Override
    public int execute(PlannedBatch batch, Instant now) {
        int pending = 0;
        for (UUID id : batch.postIds()) {
            if (write(id, now).filter(post -> post.status() == SocialPostStatus.PENDING_APPROVAL).isPresent()) {
                pending++;
            }
        }
        notice.send(pending, batch.from(), batch.to());
        return pending;
    }

    private Optional<SocialPost> write(UUID id, Instant now) {
        try {
            Optional<SocialPost> post = posts.findById(id);
            return post.map(current -> current.status() == SocialPostStatus.DRAFT ? copy.generate(id, now) : current);
        } catch (RuntimeException exception) {
            LOGGER.warn("Could not write the planned copy of social post {}: {}", id, exception.getMessage());
            return Optional.empty();
        }
    }
}
