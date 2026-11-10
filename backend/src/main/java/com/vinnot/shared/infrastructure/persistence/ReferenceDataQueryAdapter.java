package com.vinnot.shared.infrastructure.persistence;

import com.vinnot.event.infrastructure.persistence.jpa.EventStatusJpaRepository;
import com.vinnot.event.infrastructure.persistence.jpa.EventTypeJpaRepository;
import com.vinnot.shared.application.dto.ReferenceDataResponse;
import com.vinnot.shared.application.port.ReferenceDataQueryPort;
import com.vinnot.wine.infrastructure.persistence.jpa.WineTypeJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Persistence adapter that aggregates DB-backed reference catalogs owned by the
 * {@code wine} and {@code event} modules. Centralising the cross-module read here
 * keeps the web layer free of persistence concerns.
 */
@Component
@RequiredArgsConstructor
public class ReferenceDataQueryAdapter implements ReferenceDataQueryPort {

    private final WineTypeJpaRepository wineTypeRepository;
    private final EventTypeJpaRepository eventTypeRepository;
    private final EventStatusJpaRepository eventStatusRepository;

    @Override
    @Transactional(readOnly = true)
    public List<ReferenceDataResponse> getWineTypes() {
        return wineTypeRepository.findByActiveTrueOrderBySortOrderAsc()
                .stream()
                .map(e -> new ReferenceDataResponse(e.getCode(), e.getNameEs(), e.getNameEn()))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReferenceDataResponse> getEventTypes() {
        return eventTypeRepository.findByActiveTrueOrderBySortOrderAsc()
                .stream()
                .map(e -> new ReferenceDataResponse(e.getCode(), e.getNameEs(), e.getNameEn()))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReferenceDataResponse> getEventStatuses() {
        return eventStatusRepository.findByActiveTrueOrderBySortOrderAsc()
                .stream()
                .map(e -> new ReferenceDataResponse(e.getCode(), e.getNameEs(), e.getNameEn()))
                .toList();
    }
}

