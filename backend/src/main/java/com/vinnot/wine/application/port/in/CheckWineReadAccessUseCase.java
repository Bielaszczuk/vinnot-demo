package com.vinnot.wine.application.port.in;

import com.vinnot.shared.domain.valueobject.ResourceReader;

import java.util.UUID;

public interface CheckWineReadAccessUseCase {
    void check(UUID wineId, ResourceReader reader);
}
