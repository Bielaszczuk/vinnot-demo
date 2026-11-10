package com.vinnot.ai.application.port.in;

import com.vinnot.ai.application.dto.AiProfileResponse;

import java.util.Map;
import java.util.UUID;

/** Applies an administrative correction to one localized AI profile. */
public interface UpdateAiProfileUseCase {

    AiProfileResponse update(UUID wineId, String language, Map<String, Object> profileJson);
}
