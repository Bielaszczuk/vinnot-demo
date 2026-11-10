package com.vinnot.admin.application.port.out;

import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public interface EventQueryPort {

    /**
     * Counts total events.
     *
     * @return the total count
     */
    long count();

    /**
     * Counts published events.
     *
     * @return the count of published events
     */
    long countPublished();

    /**
     * Searches all events (no status filter, for admin).
     *
     * @param searchTerm search term for title
     * @param eventType  event type filter
     * @param city       city filter
     * @param pageQuery  pagination info
     * @return page of matching event summary data
     */
    PageResult<EventSummaryData> searchAll(String searchTerm, String eventType,
                                           String city, PageQuery pageQuery);

    record EventSummaryData(
            UUID id,
            String title,
            String type,
            Instant startDate,
            Instant endDate,
            String locationName,
            String locationCity,
            String locationRegion,
            String locationCountry,
            BigDecimal latitude,
            BigDecimal longitude,
            BigDecimal price,
            Integer maxAttendees,
            int currentAttendees,
            Integer availableSpots,
            String status,
            String imageUrl,
            UUID organizerId
    ) {
    }
}
