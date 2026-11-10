package com.vinnot.wine.application.port.out;

import java.util.List;
import java.util.UUID;

public interface GrapeTypeRepositoryPort {

    /**
     * Finds all active grape types ordered by name ascending.
     *
     * @return list of active grape types
     */
    List<GrapeTypeData> findAllActive();

    record GrapeTypeData(
            UUID id,
            String name,
            String nameEs,
            String category
    ) {
    }
}
