package com.vinnot.ai.application.service;

import java.util.Objects;
import tools.jackson.databind.ObjectMapper;
import com.vinnot.shared.infrastructure.metrics.OperationalTelemetry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import com.vinnot.shared.infrastructure.ai.OpenAiClient;
import com.vinnot.shared.infrastructure.ai.OpenAiTestFixtures;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.valueobject.WineType;
import com.vinnot.winery.application.port.out.WineryRepositoryPort;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.test.util.ReflectionTestUtils;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.Arrays;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.IntStream;
import com.vinnot.ai.domain.valueobject.AiContentLanguage;
import java.util.function.Supplier;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

/** Opt-in only. Eight requests maximum; no database and no provider retries. */
@EnabledIfEnvironmentVariable(named = "VINNOT_REAL_AI_ACCEPTANCE", matches = "true")
class RealAiIssue124AcceptanceTest {
    @Test
    void evaluatesBoundedControlledCasesWithoutPersistence() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        OpenAiClient provider = spy(new OpenAiClient(mapper, "https://api.openai.com/v1/chat/completions",
                Duration.ofSeconds(10), Duration.ofSeconds(45),
                OpenAiTestFixtures.admission(), OpenAiTestFixtures.pricing(), new OperationalTelemetry(new SimpleMeterRegistry())));
        AtomicReference<Object> rawResponse = new AtomicReference<>();
        doAnswer(call -> {
            Object response = call.callRealMethod();
            rawResponse.set(response);
            return response;
        }).when(provider).chatCompletion(anyString(), anyDouble(), anyInt());
        ReflectionTestUtils.setField(provider, "apiKey", System.getenv("OPENAI_API_KEY"));
        ReflectionTestUtils.setField(provider, "aiEnabled", true);
        ReflectionTestUtils.setField(provider, "aiProvider", "openai");
        ReflectionTestUtils.setField(provider, "model", System.getenv().getOrDefault("OPENAI_MODEL", "gpt-4o-mini"));
        ReflectionTestUtils.setField(provider, "maxAttempts", 1);
        assertThat(provider.isAvailable()).isTrue();
        WineryRepositoryPort wineries = mock(WineryRepositoryPort.class);
        var profiles = new AiProfilePromptBuilder(wineries, provider);
        var comparisons = new WineComparisonContentGenerator(provider,
                new WineComparisonContextBuilder(wineries), new WineComparisonContentValidator(),
                new WineComparisonAttributeNormalizer());
        Wine red = Wine.create("Controlled Malbec A", null, WineType.RED, UUID.randomUUID());
        red.updateGrapes(List.of("Malbec"));
        red.updateDescriptions("Fruta negra, taninos firmes y cuerpo pleno documentados en catálogo.",
                "Catalog documents black fruit, firm tannins and full body.");
        red.updateTasteProfile(55, 80, 85, 5);
        Wine white = Wine.create("Controlled Sauvignon Blanc B", null, WineType.WHITE, UUID.randomUUID());
        white.updateGrapes(List.of("Sauvignon Blanc"));
        white.updateDescriptions("Perfil cítrico, acidez alta y cuerpo ligero documentados.",
                "Catalog documents citrus, high acidity and light body.");
        white.updateTasteProfile(85, 0, 30, 5);
        Wine sparse = Wine.create("Controlled Malbec C", null, WineType.RED, UUID.randomUUID());
        sparse.updateGrapes(List.of("Malbec"));
        Wine unknown = Wine.create("Controlled Red D", null, WineType.RED, UUID.randomUUID());
        Wine similar = Wine.create("Controlled Malbec E", null, WineType.RED, UUID.randomUUID());
        similar.updateGrapes(List.of("Malbec"));
        similar.updateDescriptions("Fruta roja, taninos suaves y cuerpo medio documentados.",
                "Catalog documents red fruit, soft tannins and medium body.");
        similar.updateTasteProfile(65, 35, 50, 5);
        List<Supplier<MultilingualAiContent>> cases = List.of(
                () -> profiles.generateMultilingual(red).orElseThrow(),
                () -> profiles.generateMultilingual(sparse).orElseThrow(),
                () -> profiles.generateMultilingual(white).orElseThrow(),
                () -> comparisons.generate(red, white),
                () -> comparisons.generate(red, white),
                () -> comparisons.generate(red, similar),
                () -> comparisons.generate(red, sparse),
                () -> comparisons.generate(sparse, unknown));
        boolean profilesOnly = "true".equals(System.getenv("VINNOT_REAL_AI_PROFILE_RECHECK"));
        int[] selectedCases = Objects.isNull(System.getenv("VINNOT_REAL_AI_CASES"))
                ? IntStream.rangeClosed(1, profilesOnly ? 2 : cases.size()).toArray()
                : Arrays.stream(System.getenv("VINNOT_REAL_AI_CASES").split(","))
                        .map(String::strip).mapToInt(Integer::parseInt).distinct().toArray();
        assertThat(selectedCases).isNotEmpty();
        assertThat(Arrays.stream(selectedCases).allMatch(value -> value >= 1 && value <= cases.size())).isTrue();
        Path evidencePath = Path.of("../planning/ISSUE_124_REAL_AI_" + System.currentTimeMillis() + ".json");
        List<Map<String, Object>> evidence = new ArrayList<>();
        for (int selectedCase : selectedCases) {
            int index = selectedCase - 1;
            rawResponse.set(null);
            long started = System.nanoTime();
            Map<String, Object> record = new LinkedHashMap<>();
            record.put("case", index + 1);
            record.put("model", provider.configurationId());
            record.put("profilePromptVersion", "profile-v8:focused-wine-summary");
            record.put("technicalSuccessIsNotSemanticAcceptance", true);
            try {
                var response = cases.get(index).get();
                record.put("es", response.content(AiContentLanguage.SPANISH));
                record.put("en", response.content(AiContentLanguage.ENGLISH));
                record.put("enrichment", response.enrichment());
                record.put("success", true);
            } catch (RuntimeException exception) {
                record.put("success", false);
                record.put("errorType", exception.getClass().getSimpleName());
            }
            record.put("elapsedMs", (System.nanoTime() - started) / 1_000_000);
            record.put("rawProviderResponse", rawResponse.get());
            record.put("providerResponded", Objects.nonNull(rawResponse.get()));
            evidence.add(record);
            Files.writeString(evidencePath,
                    mapper.writerWithDefaultPrettyPrinter().writeValueAsString(evidence));
            System.out.println("Acceptance case " + (index + 1) + ": success=" + record.get("success")
                    + " elapsedMs=" + record.get("elapsedMs"));
        }
        assertThat(evidence).allMatch(record -> Boolean.TRUE.equals(record.get("success")));
    }
}
