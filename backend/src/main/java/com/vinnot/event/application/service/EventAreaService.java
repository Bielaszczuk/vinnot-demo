package com.vinnot.event.application.service;

import com.vinnot.event.application.port.in.ManageEventAreaUseCase;
import com.vinnot.event.application.port.out.EventAreaRepository;
import com.vinnot.event.domain.valueobject.EventArea;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EventAreaService implements ManageEventAreaUseCase {
    private final EventAreaRepository areas;

    @Override
    @Transactional(readOnly = true)
    public Optional<AreaView> find(UUID userId) {
        return areas.find(userId);
    }

    @Override
    @Transactional
    public void set(UUID userId, EventArea area) {
        if (!areas.save(userId, area)) {
            throw new EntityNotFoundException("Region", area.regionId());
        }
    }

    @Override
    @Transactional
    public void clear(UUID userId) {
        areas.delete(userId);
    }
}
