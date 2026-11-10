package com.vinnot.ai.application.port.in;

import com.vinnot.ai.application.dto.WineComparisonResponse;

import java.util.UUID;

/** Generates or reads a localized comparison for a pair of wines. */
public interface CompareWinesUseCase {

    WineComparisonResponse compare(UUID wineAId, UUID wineBId, String language);
}
