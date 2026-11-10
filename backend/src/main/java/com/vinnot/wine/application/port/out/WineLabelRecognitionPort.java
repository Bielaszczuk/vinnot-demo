package com.vinnot.wine.application.port.out;

import com.vinnot.wine.domain.model.ExtractedWineLabel;
import java.time.Duration;

/**
 * Driven port for provider-independent wine-label recognition.
 */
public interface WineLabelRecognitionPort {

    ExtractedWineLabel recognize(byte[] imageBytes, String contentType);

    default ExtractedWineLabel recognize(byte[] imageBytes, String contentType, Duration remaining) {
        return recognize(imageBytes, contentType);
    }
}
