package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.exception.SocialPostDateTakenException;
import com.vinnot.marketing.application.exception.SocialPublishingOffException;
import com.vinnot.marketing.application.model.PublishingSettings;
import com.vinnot.marketing.application.model.SocialPostAdminResponse;
import com.vinnot.marketing.application.port.in.ScheduleSocialPostUseCase;
import com.vinnot.marketing.application.port.out.SocialPostRepository;
import com.vinnot.marketing.domain.exception.InvalidPostTransitionException;
import com.vinnot.marketing.domain.model.SocialPost;
import com.vinnot.marketing.domain.model.SocialPostStatus;
import com.vinnot.marketing.domain.service.WeeklyPlanner;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

/**
 * The admin's schedule actions (#513). A reschedule moves a post whose publishing has not started to a future time, keeping
 * its status, only when no other post goes out that local date (the planner's zone). Publish now moves an approved post with
 * ready media to now (refused first while publishing is off or no network is enabled) and starts its publishing at once on every enabled network, ignoring their not-before times, through the
 * same start as the sweep ({@link SocialPublishingStarter}). Both write the new time only over the status and time they read,
 * so they never race the publishing sweep: the loser conflicts with {@code INVALID_POST_TRANSITION}.
 */
@Service
@RequiredArgsConstructor
public class SocialPostScheduleService implements ScheduleSocialPostUseCase {
    private static final String SAVE_OVER = "save a change read from";
    private final SocialPostRepository posts;
    private final SocialPublishingStarter starter;
    private final PublishingSettings publishing;
    private final WeeklyPlanner.Settings planner;
    private final SocialPostPresenter presenter;

    @Override
    public SocialPostAdminResponse reschedule(UUID postId, Instant scheduledFor, Instant now) {
        SocialPost post = load(postId);
        SocialPostStatus readStatus = post.status();
        Instant readTime = post.scheduledFor();
        post.reschedule(scheduledFor, now);
        LocalDate date = post.scheduledFor().atZone(planner.zone()).toLocalDate();
        Instant dayStart = date.atStartOfDay(planner.zone()).toInstant();
        Instant dayEnd = date.plusDays(1).atStartOfDay(planner.zone()).toInstant().minus(1, ChronoUnit.MICROS);
        if (posts.findScheduledBetween(dayStart, dayEnd).stream().anyMatch(other -> !other.id().equals(postId))) {
            throw new SocialPostDateTakenException(date);
        }
        if (!posts.saveScheduleIfUnchanged(post, readStatus, readTime)) {
            throw new InvalidPostTransitionException(readStatus, SAVE_OVER);
        }
        return presenter.present(post);
    }

    /** One transaction: if the start cannot complete, the moved time is rolled back too. */
    @Override
    @Transactional
    public SocialPostAdminResponse publishNow(UUID postId, Instant now) {
        SocialPost post = load(postId);
        if (!publishing.publishesAny()) {
            throw new SocialPublishingOffException();
        }
        Instant readTime = post.scheduledFor();
        post.publishNow(now);
        if (!posts.saveScheduleIfUnchanged(post, SocialPostStatus.APPROVED, readTime)
                || starter.startNow(post, now) != SocialPublishingStarter.Result.STARTED) {
            throw new InvalidPostTransitionException(SocialPostStatus.APPROVED, SAVE_OVER);
        }
        return presenter.present(post);
    }

    private SocialPost load(UUID postId) {
        return posts.findById(postId).orElseThrow(() -> new EntityNotFoundException("SocialPost", postId));
    }
}
