package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.model.ContentPillarResponse;
import com.vinnot.marketing.application.model.SocialPostAdminResponse;
import com.vinnot.marketing.application.model.WineDayResponse;
import com.vinnot.marketing.application.port.in.BrowseSocialPostsUseCase;
import com.vinnot.marketing.application.port.out.ContentPillarCatalog;
import com.vinnot.marketing.application.port.out.SocialPostRepository;
import com.vinnot.marketing.application.port.out.WineDayCatalog;
import com.vinnot.marketing.domain.model.SocialPostStatus;
import com.vinnot.marketing.domain.service.WeeklyPlanner;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.shared.domain.valueobject.PageResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/** Reads for the admin page (#489): the queue, one post, the calendar of a year and the pillars with their performance (#510). */
@Service
@RequiredArgsConstructor
public class SocialPostQueryService implements BrowseSocialPostsUseCase {
    /** A page never asks the database for a negative or unbounded LIMIT/OFFSET. */
    private static final int MAX_PAGE_SIZE = 100;
    private final SocialPostRepository posts;
    private final WineDayCatalog wineDays;
    private final ContentPillarCatalog pillars;
    private final SocialPostPresenter presenter;
    private final WeeklyPlanner.Settings settings;
    private final PillarPerformanceService performance;

    @Override
    public PageResult<SocialPostAdminResponse> search(SocialPostStatus status, LocalDate from, LocalDate to, int page, int size) {
        Instant start = Objects.isNull(from) ? null : from.atStartOfDay(settings.zone()).toInstant();
        Instant end = Objects.isNull(to) ? null : to.plusDays(1).atStartOfDay(settings.zone()).toInstant().minusSeconds(1);
        return posts.search(status, start, end, Math.max(page, 0), Math.clamp(size, 1, MAX_PAGE_SIZE)).map(presenter::present);
    }

    @Override
    public SocialPostAdminResponse get(UUID postId) {
        return presenter.present(posts.findById(postId).orElseThrow(() -> new EntityNotFoundException("SocialPost", postId)));
    }

    @Override
    public List<WineDayResponse> wineDays(int year) {
        return wineDays.all().stream()
                .map(day -> new WineDayResponse(day.code(), day.nameEs(), day.nameEn(), day.kind(), day.priority(), day.countryCode(), day.on(year)))
                .sorted(Comparator.comparing(WineDayResponse::date).thenComparing(WineDayResponse::code)).toList();
    }

    @Override
    public List<ContentPillarResponse> pillars() {
        return performance.present(pillars.all());
    }
}
