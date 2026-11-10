package com.vinnot.event.application.query.handler;

import com.vinnot.event.application.port.in.GetMyEventsUseCase;
import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.application.query.model.GetMyEventsQuery;
import com.vinnot.event.application.query.response.EventSummaryResponse;
import com.vinnot.event.domain.model.Event;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;

import java.util.Objects;

@Service
@RequiredArgsConstructor
public class GetMyEventsQueryHandler implements GetMyEventsUseCase {

    private final EventRepositoryPort eventRepository;

    @Override
    @Transactional(readOnly = true)
    public PageResult<EventSummaryResponse> execute(GetMyEventsQuery query) {
        PageQuery newestFirst = PageQuery.of(query.page(), query.size(), "createdAt", PageQuery.SortDirection.DESC);
        String searchTerm = normalize(query.searchTerm());
        PageResult<Event> events = Objects.isNull(searchTerm)
                ? eventRepository.findByOrganizer(query.organizerId(), newestFirst)
                : eventRepository.searchByOrganizer(query.organizerId(), searchTerm, newestFirst);
        return events.map(EventSummaryResponse::fromDomain);
    }

    private String normalize(String value) {
        if (Objects.isNull(value)) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}

