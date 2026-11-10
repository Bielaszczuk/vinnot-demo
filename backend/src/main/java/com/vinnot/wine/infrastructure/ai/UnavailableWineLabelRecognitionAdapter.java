package com.vinnot.wine.infrastructure.ai;

import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import com.vinnot.wine.application.port.out.WineLabelRecognitionPort;
import com.vinnot.wine.domain.model.ExtractedWineLabel;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Explicit local fallback: it keeps dependency injection valid but never
 * pretends that a mock response is a real recognition result.
 */
@Component
@ConditionalOnProperty(
        name = "ai.provider",
        havingValue = "mock",
        matchIfMissing = true)
public class UnavailableWineLabelRecognitionAdapter implements WineLabelRecognitionPort {

    @Override
    public ExtractedWineLabel recognize(byte[] imageBytes, String contentType) {
        throw new ExternalServiceUnavailableException(
                "LABEL_RECOGNITION_NOT_CONFIGURED",
                "Configure AI_PROVIDER=openai and OPENAI_API_KEY to scan wine labels",
                null);
    }
}
