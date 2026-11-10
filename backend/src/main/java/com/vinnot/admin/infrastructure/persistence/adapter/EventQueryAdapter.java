package com.vinnot.admin.infrastructure.persistence.adapter;

import com.vinnot.admin.application.port.out.EventQueryPort;
import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.domain.model.Event;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import org.springframework.stereotype.Component;

import java.util.Objects;
import lombok.RequiredArgsConstructor;
import java.math.BigDecimal;

@Component("adminEventQueryAdapter")
@RequiredArgsConstructor
public class EventQueryAdapter implements EventQueryPort {

    private final EventRepositoryPort eventRepository;

    @Override
    public long count() {
        return eventRepository.count();
    }

    @Override
    public long countPublished() {
        return eventRepository.countPublished();
    }

    @Override
    public PageResult<EventSummaryData> searchAll(String searchTerm, String eventType,
                                                   String city, PageQuery pageQuery) {
        return eventRepository.searchAll(searchTerm, eventType, city, pageQuery)
                .map(this::toEventSummaryData);
    }

    private EventSummaryData toEventSummaryData(Event event) {
        String locName = null;
        String locCity = null;
        String locRegion = null;
        String locCountry = null;
        BigDecimal lat = null;
        BigDecimal lng = null;
        if (Objects.nonNull(event.getLocation())) {
            locName = event.getLocation().getName();
            locCity = event.getLocation().getCity();
            locRegion = event.getLocation().getRegion();
            locCountry = event.getLocation().getCountry();
            if (event.getLocation().hasCoordinates()) {
                lat = event.getLocation().getCoordinates().getLatitude();
                lng = event.getLocation().getCoordinates().getLongitude();
            }
        }

        return new EventSummaryData(
                event.getId(),
                event.getTitle(),
                event.getEventType().name(),
                event.getDateRange().getStartDate(),
                event.getDateRange().getEndDate(),
                locName,
                locCity,
                locRegion,
                locCountry,
                lat,
                lng,
                event.getPrice(),
                event.getCapacity().getMaxAttendees(),
                event.getCapacity().getCurrentAttendees(),
                event.getCapacity().getAvailableSpots(),
                event.getStatus().name(),
                event.getImageUrl(),
                event.getOrganizerId()
        );
    }
}
