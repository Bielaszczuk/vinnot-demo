package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.model.PlanResult;
import com.vinnot.marketing.application.model.PlannedBatch;
import com.vinnot.marketing.application.port.in.PlanWeekUseCase;
import com.vinnot.marketing.application.port.out.ContentPillarCatalog;
import com.vinnot.marketing.application.port.out.SocialCopyQueue;
import com.vinnot.marketing.application.port.out.SocialPostRepository;
import com.vinnot.marketing.application.port.out.WineDayCatalog;
import com.vinnot.marketing.domain.model.SocialPost;
import com.vinnot.marketing.domain.service.WeeklyPlanner;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Plans the next two weeks (#489): the domain planner decides the dates and times (#513: existing posts count by date and
 * their wine days are not planned again, wherever the admin moved them), each new draft is saved and the batch is
 * queued for its copy in the same transaction. The queued job writes the copy and sends the admins one batch notice
 * ({@link PlannedCopyService}), so "Plan now" answers in a moment instead of waiting on the AI past the edge timeout. The
 * rotation weighs each pillar by its recent performance ({@link PillarPerformanceService}, #510). A slot of today that already
 * passed is skipped: a post in the past would never be approved in time.
 */
@Service
@RequiredArgsConstructor
public class PlanWeekService implements PlanWeekUseCase {
    private final WeeklyPlanner planner;
    private final WeeklyPlanner.Settings settings;
    private final SocialPostRepository posts;
    private final WineDayCatalog wineDays;
    private final ContentPillarCatalog pillars;
    private final SocialCopyQueue copyQueue;
    private final PillarPerformanceService performance;

    @Override
    @Transactional
    public PlanResult execute(Instant now) {
        LocalDate from = now.atZone(settings.zone()).toLocalDate();
        LocalDate to = planner.windowEnd(from);
        Instant historyStart = from.minusDays(settings.windowDays()).atStartOfDay(settings.zone()).toInstant();
        Instant windowEnd = to.plusDays(1).atStartOfDay(settings.zone()).toInstant().minusSeconds(1);
        List<WeeklyPlanner.Existing> existing = posts.findScheduledBetween(historyStart, windowEnd).stream()
                .map(post -> new WeeklyPlanner.Existing(post.scheduledFor(), post.pillarCode(), post.wineDayCode())).toList();
        List<SocialPost> created = new ArrayList<>();
        for (WeeklyPlanner.Planned planned : planner.plan(from, wineDays.all(), pillars.all(), existing, performance.factors(now))) {
            if (!planned.scheduledFor().isAfter(now)) {
                continue;
            }
            SocialPost post = SocialPost.planned(UUID.randomUUID(), planned.scheduledFor(), planned.pillarCode(), planned.wineDayCode(), now);
            posts.save(post);
            created.add(post);
        }
        if (!created.isEmpty()) {
            copyQueue.enqueue(new PlannedBatch(created.stream().map(SocialPost::id).toList(), from, to));
        }
        return new PlanResult(created.size(), from, to);
    }
}
