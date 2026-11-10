package com.vinnot.ai.application.port.in;

import com.vinnot.ai.application.dto.AiProfileResponse;

import java.util.Optional;
import java.util.UUID;

/** Reads an already generated AI profile without causing side effects. */
public interface GetAiProfileUseCase {

    Optional<AiProfileResponse> get(UUID wineId, String language);
}
