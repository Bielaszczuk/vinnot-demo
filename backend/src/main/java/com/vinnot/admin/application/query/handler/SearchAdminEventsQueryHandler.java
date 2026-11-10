package com.vinnot.admin.application.query.handler;

import com.vinnot.admin.application.port.in.SearchAdminEventsUseCase;
import com.vinnot.admin.application.port.out.EventQueryPort;
import com.vinnot.admin.application.query.model.SearchAdminEventsQuery;
import com.vinnot.admin.application.query.response.AdminEventSummaryResponse;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SearchAdminEventsQueryHandler implements SearchAdminEventsUseCase {

    private final EventQueryPort eventQueryPort;

    @Override
    @Transactional(readOnly = true)
    public PageResult<AdminEventSummaryResponse> execute(SearchAdminEventsQuery query) {
        return eventQueryPort.searchAll(
                query.search(), query.type(), query.city(),
                PageQuery.of(query.page(), query.size(), "createdAt", PageQuery.SortDirection.DESC))
                .map(AdminEventSummaryResponse::fromData);
    }
}

