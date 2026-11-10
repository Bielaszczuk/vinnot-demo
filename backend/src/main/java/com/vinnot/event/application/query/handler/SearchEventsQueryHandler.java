package com.vinnot.event.application.query.handler;

import com.vinnot.event.application.port.in.SearchEventsUseCase;
import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.application.query.model.SearchEventsQuery;
import com.vinnot.event.application.query.response.EventSummaryResponse;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;

import java.util.Objects;

@Service
@RequiredArgsConstructor
public class SearchEventsQueryHandler implements SearchEventsUseCase {

    private static final int MAX_PAGE_SIZE = 100;

    private final EventRepositoryPort eventRepository;

    @Override
    @Transactional(readOnly = true)
    public PageResult<EventSummaryResponse> execute(SearchEventsQuery query) {
        return eventRepository.search(
                normalize(query.searchTerm()),
                query.eventType(),
                normalize(query.city()),
                normalize(query.region()),
                normalize(query.country()),
                PageQuery.bounded(query.page(), query.size(), MAX_PAGE_SIZE)
        ).map(EventSummaryResponse::fromDomain);
    }

    private String normalize(String value) {
        if (Objects.isNull(value)) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}
