package com.vinnot.shared.application.port;

import com.vinnot.shared.application.dto.ReferenceDataResponse;

import java.util.List;

/**
 * Driven port exposing DB-backed reference catalogs (wine types, event types,
 * event statuses) to the application/web layer without leaking persistence details.
 */
public interface ReferenceDataQueryPort {

    /**
     * @return all active wine types ordered by sort order
     */
    List<ReferenceDataResponse> getWineTypes();

    /**
     * @return all active event types ordered by sort order
     */
    List<ReferenceDataResponse> getEventTypes();

    /**
     * @return all active event statuses ordered by sort order
     */
    List<ReferenceDataResponse> getEventStatuses();
}

