package com.vinnot.event.application.query.handler;

import com.vinnot.event.application.port.in.GetNearbyEventsUseCase;
import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.application.query.model.GetNearbyEventsQuery;
import com.vinnot.event.application.query.response.EventSummaryResponse;
import com.vinnot.event.domain.model.Event;
import com.vinnot.shared.domain.util.GeoUtils;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GetNearbyEventsQueryHandler implements GetNearbyEventsUseCase {

    private static final int MAX_CANDIDATES = 500;
    private static final double MAX_LATITUDE = 90;
    private static final double MAX_LONGITUDE = 180;
    private static final double MAX_RADIUS_KM = 500;

    private final EventRepositoryPort eventRepository;

    @Override
    @Transactional(readOnly = true)
    public PageResult<EventSummaryResponse> execute(GetNearbyEventsQuery query) {
        PageQuery.of(query.page(), query.size());
        if (!Double.isFinite(query.latitude()) || Math.abs(query.latitude()) > MAX_LATITUDE
                || !Double.isFinite(query.longitude()) || Math.abs(query.longitude()) > MAX_LONGITUDE
                || !Double.isFinite(query.radiusKm()) || query.radiusKm() <= 0
                || query.radiusKm() > MAX_RADIUS_KM) {
            throw new BusinessRuleViolationException("INVALID_EVENT_LOCATION",
                    "Coordinates must be finite and valid, and radius between 0 and 500 km");
        }

        List<Event> nearbyEvents = eventRepository.findNearby(
                query.latitude(), query.longitude(), query.radiusKm(), MAX_CANDIDATES);

        List<EventSummaryResponse> eventsWithDistance = nearbyEvents.stream()
                .map(event -> {
                    double distance = calculateDistance(event, query.latitude(), query.longitude());
                    double roundedDistance = Math.round(distance * 10.0) / 10.0;
                    return EventSummaryResponse.fromDomainWithDistance(event, roundedDistance);
                })
                .filter(summary -> summary.distanceKm() <= query.radiusKm())
                .sorted(Comparator.comparingDouble(
                        summary -> Objects.nonNull(summary.distanceKm())
                                ? summary.distanceKm() : Double.MAX_VALUE))
                .toList();

        int start = (int) Math.min((long) query.page() * query.size(), eventsWithDistance.size());
        int end = Math.min(start + query.size(), eventsWithDistance.size());

        List<EventSummaryResponse> pageContent = start < eventsWithDistance.size()
                ? eventsWithDistance.subList(start, end)
                : List.of();

        return PageResult.of(
                pageContent,
                query.page(),
                query.size(),
                eventsWithDistance.size()
        );
    }

    private double calculateDistance(Event event, double queryLat, double queryLon) {
        if (Objects.nonNull(event.getLocation()) && event.getLocation().hasCoordinates()) {
            return GeoUtils.haversineDistance(
                    queryLat, queryLon,
                    event.getLocation().getCoordinates().getLatitude().doubleValue(),
                    event.getLocation().getCoordinates().getLongitude().doubleValue());
        }
        return Double.MAX_VALUE;
    }
}
