package com.vinnot.marketing.application.port.in;

import com.vinnot.marketing.application.model.ContentPillarResponse;
import com.vinnot.marketing.application.model.SocialPostAdminResponse;
import com.vinnot.marketing.application.model.WineDayResponse;
import com.vinnot.marketing.domain.model.SocialPostStatus;
import com.vinnot.shared.domain.valueobject.PageResult;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Reads the queue, the wine-day calendar and the pillars (#489). */
public interface BrowseSocialPostsUseCase {
    /** Posts sorted by their slot; every filter is optional and dates are Argentina days, inclusive. */
    PageResult<SocialPostAdminResponse> search(SocialPostStatus status, LocalDate from, LocalDate to, int page, int size);

    SocialPostAdminResponse get(UUID postId);

    List<WineDayResponse> wineDays(int year);

    List<ContentPillarResponse> pillars();
}
