package com.vinnot.event.application.port.out;

import com.vinnot.event.application.port.in.ManageEventAreaUseCase.AreaView;
import com.vinnot.event.domain.valueobject.EventArea;

import java.util.Optional;
import java.util.UUID;

public interface EventAreaRepository {
    Optional<AreaView> find(UUID userId);

    /** Stores the area; returns false when its region does not exist. */
    boolean save(UUID userId, EventArea area);

    void delete(UUID userId);
}
