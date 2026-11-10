package com.vinnot.shared.infrastructure.ai;

import com.vinnot.shared.application.port.AiImageService;
import com.vinnot.shared.application.port.AiProviderAdmissionPort;
import com.vinnot.shared.infrastructure.metrics.OperationalTelemetry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.boot.convert.ApplicationConversionService;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

class OpenAiImageClientWiringTest {

    // The application context uses Boot's conversion service, which turns "10s" into a Duration.
    private final ApplicationContextRunner context = new ApplicationContextRunner()
            .withInitializer(started -> started.getBeanFactory()
                    .setConversionService(ApplicationConversionService.getSharedInstance()))
            .withUserConfiguration(OpenAiImageClient.class)
            .withBean(ObjectMapper.class, ObjectMapper::new)
            .withBean(AiProviderAdmissionPort.class, OpenAiTestFixtures::admission)
            .withBean(OperationalTelemetry.class, () -> new OperationalTelemetry(new SimpleMeterRegistry()));

    @Test
    void bindsTheImageSettingsAndStaysUnavailableByDefault() {
        context.withPropertyValues("ai.enabled=true", "ai.provider=openai", "services.openai.api-key=configured")
                .run(started -> {
                    assertThat(started).hasNotFailed();
                    assertThat(started.getBean(AiImageService.class).isAvailable()).isFalse();
                    assertThat(started.getBean(OpenAiImageProperties.class).enabled()).isFalse();
                });
    }

    @Test
    void enabledSettingsMakeTheProviderAvailable() {
        context.withPropertyValues("ai.enabled=true", "ai.provider=openai", "services.openai.api-key=configured",
                        "ai.images.enabled=true", "ai.images.max-cost-usd=0.30", "ai.images.timeout=90s",
                        "ai.images.quality=high")
                .run(started -> {
                    var properties = started.getBean(OpenAiImageProperties.class);
                    assertThat(started.getBean(AiImageService.class).isAvailable()).isTrue();
                    assertThat(properties.maxCostUsd()).isEqualByComparingTo("0.30");
                    assertThat(properties.timeout()).isEqualTo(Duration.ofSeconds(90));
                    assertThat(properties.quality()).isEqualTo("high");
                });
    }

    @Test
    void unboundedSettingsFailStartup() {
        context.withPropertyValues("ai.images.timeout=5m").run(started -> assertThat(started).hasFailed());
    }
}
