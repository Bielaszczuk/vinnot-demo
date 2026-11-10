package com.vinnot.wine.infrastructure.config;

import com.vinnot.shared.application.port.AiImageCompletionRequest.ImageDetail;
import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertEquals;

class WineLabelRecognitionPropertiesTest {

    @Test
    void shouldApplyTheCalibratedDefaultsWhenNoOverrideIsProvided() {
        WineLabelRecognitionProperties properties =
                new WineLabelRecognitionProperties(null, null, null, null);

        assertEquals(Duration.ofSeconds(12), properties.timeout());
        assertEquals(ImageDetail.HIGH, properties.detail());
        assertEquals(500, properties.maxTokens());
        assertEquals(1, properties.maxAttempts());
    }
}
