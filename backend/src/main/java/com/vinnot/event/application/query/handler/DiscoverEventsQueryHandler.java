package com.vinnot.event.application.query.handler;

import com.vinnot.event.application.port.in.DiscoverEventsUseCase;
import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.application.query.model.DiscoverEventsQuery;
import com.vinnot.event.application.query.response.EventDiscoveryResponse;
import com.vinnot.event.application.query.response.EventSummaryResponse;
import com.vinnot.event.domain.model.Event;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.util.GeoUtils;
import com.vinnot.shared.domain.valueobject.PageResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class DiscoverEventsQueryHandler implements DiscoverEventsUseCase {

    static final double DEFAULT_RADIUS_KM = 100.0;
    private static final double MAX_RADIUS_KM = 500.0;
    private static final double MIN_LATITUDE = -90.0;
    private static final double MAX_LATITUDE = 90.0;
    private static final double MIN_LONGITUDE = -180.0;
    private static final double MAX_LONGITUDE = 180.0;
    private static final int MAX_PAGE_SIZE = 50;
    private static final int MAX_CANDIDATES = 500;
    private static final String NO_NEARBY_EVENTS =
            "No encontramos eventos cerca de tu zona actualmente.";

    private final EventRepositoryPort eventRepository;

    @Override
    @Transactional(readOnly = true)
    public EventDiscoveryResponse execute(DiscoverEventsQuery query) {
        validate(query);
        double radius = query.radiusKm() > 0 ? query.radiusKm() : DEFAULT_RADIUS_KM;
        List<EventSummaryResponse> ordered = eventRepository.findDiscoveryCandidates(MAX_CANDIDATES)
                .stream()
                .map(event -> withDistance(event, query.latitude(), query.longitude()))
                .sorted(Comparator
                        .comparing(
                                EventSummaryResponse::distanceKm,
                                Comparator.nullsLast(Double::compareTo))
                        .thenComparing(EventSummaryResponse::startDate))
                .toList();

        List<EventSummaryResponse> nearby = ordered.stream()
                .filter(event -> Objects.nonNull(event.distanceKm()))
                .filter(event -> event.distanceKm() <= radius)
                .toList();

        if (!nearby.isEmpty()) {
            return new EventDiscoveryResponse(
                    radius,
                    true,
                    null,
                    page(nearby, query.page(), query.size()),
                    PageResult.empty());
        }

        return new EventDiscoveryResponse(
                radius,
                false,
                NO_NEARBY_EVENTS,
                PageResult.empty(),
                page(ordered, query.page(), query.size()));
    }

    private EventSummaryResponse withDistance(Event event, double latitude, double longitude) {
        Double distance = null;
        if (Objects.nonNull(event.getLocation()) && event.getLocation().hasCoordinates()) {
            distance = GeoUtils.haversineDistance(
                    latitude,
                    longitude,
                    event.getLocation().getCoordinates().getLatitude().doubleValue(),
                    event.getLocation().getCoordinates().getLongitude().doubleValue());
            distance = Math.round(distance * 10.0) / 10.0;
        }
        return EventSummaryResponse.fromDomainWithDistance(event, distance);
    }

    private PageResult<EventSummaryResponse> page(
            List<EventSummaryResponse> events,
            int page,
            int size) {
        int start = (int) Math.min((long) page * size, events.size());
        int end = Math.min(start + size, events.size());
        return PageResult.of(events.subList(start, end), page, size, events.size());
    }

    private void validate(DiscoverEventsQuery query) {
        if (!Double.isFinite(query.latitude()) || !Double.isFinite(query.longitude())
                || query.latitude() < MIN_LATITUDE || query.latitude() > MAX_LATITUDE
                || query.longitude() < MIN_LONGITUDE || query.longitude() > MAX_LONGITUDE) {
            throw new BusinessRuleViolationException(
                    "INVALID_COORDINATES",
                    "Latitude or longitude is outside the valid range");
        }
        if (!Double.isFinite(query.radiusKm())
                || query.radiusKm() < 0 || query.radiusKm() > MAX_RADIUS_KM) {
            throw new BusinessRuleViolationException(
                    "INVALID_EVENT_RADIUS",
                    "Event discovery radius must be between 0 and 500 kilometers");
        }
        if (query.page() < 0 || query.size() < 1 || query.size() > MAX_PAGE_SIZE) {
            throw new BusinessRuleViolationException(
                    "INVALID_EVENT_PAGINATION",
                    "Page must be non-negative and size must be between 1 and 50");
        }
    }
}
