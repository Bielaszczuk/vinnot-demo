package com.vinnot.wine.infrastructure.ai;

import com.vinnot.shared.application.port.AiCompletionService;
import com.vinnot.wine.domain.model.ExtractedWineLabel;
import com.vinnot.wine.infrastructure.config.WineLabelRecognitionProperties;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import com.vinnot.shared.application.port.AiImageCompletionRequest;
import java.time.Duration;
import org.mockito.ArgumentCaptor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

class OpenAiWineLabelRecognitionAdapterTest {

    @Test
    void capsProviderTimeoutToRemainingPipelineBudgetWithoutRetries() {
        AiCompletionService service = mock(AiCompletionService.class);
        when(service.structuredCompletionWithImage(any())).thenReturn(Map.of("isWineLabel", false));
        var adapter = new OpenAiWineLabelRecognitionAdapter(service,
                new WineLabelRecognitionProperties(Duration.ofSeconds(12), null, null, 3));
        adapter.recognize(new byte[]{1}, "image/jpeg", Duration.ofMillis(700));
        adapter.recognize(new byte[]{1}, "image/jpeg", Duration.ofSeconds(18));
        var requests = ArgumentCaptor.forClass(AiImageCompletionRequest.class);
        verify(service, times(2)).structuredCompletionWithImage(requests.capture());
        assertThat(requests.getAllValues()).extracting(AiImageCompletionRequest::timeout)
                .containsExactly(Duration.ofMillis(700), Duration.ofSeconds(12));
        assertThat(requests.getAllValues()).allSatisfy(request -> assertThat(request.maxAttempts()).isEqualTo(1));
        assertThat(((Map<?, ?>) requests.getValue().jsonSchema().get("properties")).keySet().iterator().next())
                .isEqualTo("observedText");
    }

    @Test
    void keepsStructuredIdentitySymbolsSeparateFromObservedText() {
        AiCompletionService completionService = mock(AiCompletionService.class);
        when(completionService.structuredCompletionWithImage(any()))
                .thenReturn(Map.ofEntries(
                        Map.entry("isWineLabel", true),
                        Map.entry("wineryName", "Santa Julia"),
                        Map.entry("wineName", "Cabernet Sauvignon"),
                        Map.entry("grapeVariety", "Cabernet Sauvignon"),
                        Map.entry("wineType", "RED"),
                        Map.entry("confidence", 0.97),
                        Map.entry("searchKeywords", "Santa Julia Cabernet Sauvignon"),
                        Map.entry("observedText", List.of("SANTA JULIA", "CABERNET SAUVIGNON")),
                        Map.entry("identitySymbols", List.of("+"))));
        OpenAiWineLabelRecognitionAdapter adapter =
                new OpenAiWineLabelRecognitionAdapter(
                        completionService,
                        new WineLabelRecognitionProperties(null, null, null, null));

        ExtractedWineLabel label = adapter.recognize(new byte[] {1}, "image/jpeg");

        assertThat(label.observedText())
                .containsExactly("SANTA JULIA", "CABERNET SAUVIGNON");
        assertThat(label.identitySymbols()).containsExactly("+");
    }
}
