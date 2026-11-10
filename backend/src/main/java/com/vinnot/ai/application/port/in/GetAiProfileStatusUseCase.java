package com.vinnot.ai.application.port.in;

import com.vinnot.ai.application.dto.AiProfileStatusResponse;

import java.util.UUID;

/** Reads the generation status of the localized AI profile bundle. */
public interface GetAiProfileStatusUseCase {

    AiProfileStatusResponse getStatus(UUID wineId, String language);
}
