package com.vinnot.ai.application.port.in;

import com.vinnot.ai.application.dto.AiProfileResponse;

import java.util.UUID;

/** Ensures or explicitly regenerates the complete localized profile bundle. */
public interface GenerateAiProfileUseCase {

    AiProfileResponse generate(UUID wineId, String language, boolean forceRegenerate);
}
