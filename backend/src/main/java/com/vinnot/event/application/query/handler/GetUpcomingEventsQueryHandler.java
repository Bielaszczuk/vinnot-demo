package com.vinnot.event.application.query.handler;

import com.vinnot.event.application.port.in.GetUpcomingEventsUseCase;
import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.application.query.model.GetUpcomingEventsQuery;
import com.vinnot.event.application.query.response.EventSummaryResponse;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GetUpcomingEventsQueryHandler implements GetUpcomingEventsUseCase {

    private static final int MAX_PAGE_SIZE = 100;

    private final EventRepositoryPort eventRepository;

    @Override
    @Transactional(readOnly = true)
    public PageResult<EventSummaryResponse> execute(GetUpcomingEventsQuery query) {
        return eventRepository.findUpcoming(PageQuery.bounded(query.page(), query.size(), MAX_PAGE_SIZE))
                .map(EventSummaryResponse::fromDomain);
    }
}
