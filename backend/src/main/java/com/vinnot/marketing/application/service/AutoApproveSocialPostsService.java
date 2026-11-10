package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.port.in.AutoApproveSocialPostsUseCase;
import com.vinnot.marketing.application.port.out.ContentPillarCatalog;
import com.vinnot.marketing.application.port.out.SocialPostRepository;
import com.vinnot.marketing.domain.model.ContentPillar;
import com.vinnot.marketing.domain.model.FactCheck;
import com.vinnot.marketing.domain.model.SocialPost;
import com.vinnot.marketing.domain.model.SocialPostMedia;
import com.vinnot.marketing.domain.model.SocialPostStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Approval by the system (#510): a pending post of a pillar with auto-approval on, whose Spanish media is ready to publish
 * and whose fact check passed, is approved once its slot is {@code app.marketing.auto-approve.lead} (24 hours) away or
 * less but still ahead: a pending post whose slot arrived or passed is never approved, so it can never be published late.
 * The approval is a compare-and-set, so an admin's edit, rejection or approval meanwhile is never overwritten.
 */
@Service
public class AutoApproveSocialPostsService implements AutoApproveSocialPostsUseCase {
    private static final Logger LOGGER = LoggerFactory.getLogger(AutoApproveSocialPostsService.class);
    private final SocialPostRepository posts;
    private final ContentPillarCatalog pillars;
    private final Duration lead;

    public AutoApproveSocialPostsService(SocialPostRepository posts, ContentPillarCatalog pillars,
            @Value("${app.marketing.auto-approve.lead:24h}") Duration lead) {
        this.posts = posts;
        this.pillars = pillars;
        this.lead = lead;
    }

    @Override
    public int autoApprove(Instant now) {
        Set<String> autoApproving = pillars.all().stream().filter(ContentPillar::autoApprove).map(ContentPillar::code)
                .collect(Collectors.toSet());
        if (autoApproving.isEmpty()) {
            return 0;
        }
        Instant horizon = now.plus(lead);
        int approved = 0;
        for (SocialPost post : posts.findScheduledBetween(now, horizon)) {
            if (eligible(post, autoApproving, now, horizon) && approve(post, now)) {
                approved++;
            }
        }
        return approved;
    }

    /**
     * A pending post of an auto-approving pillar, slotted strictly after now and at or before the horizon, with ready media
     * and a passed fact check.
     */
    private static boolean eligible(SocialPost post, Set<String> autoApproving, Instant now, Instant horizon) {
        return post.status() == SocialPostStatus.PENDING_APPROVAL && autoApproving.contains(post.pillarCode())
                && post.scheduledFor().isAfter(now) && !post.scheduledFor().isAfter(horizon) && post.readyToPublish()
                && post.generation().factCheck() == FactCheck.PASSED;
    }

    private boolean approve(SocialPost post, Instant now) {
        Instant storedAt = post.updatedAt();
        SocialPostMedia storedMedia = post.media();
        post.autoApprove(now);
        if (!posts.saveApprovalIfUnchanged(post, storedAt, storedMedia)) {
            LOGGER.info("Social post {} changed before its automatic approval; left as it is", post.id());
            return false;
        }
        LOGGER.info("Social post {} ({}) approved automatically for {}", post.id(), post.pillarCode(), post.scheduledFor());
        return true;
    }
}
