package com.vinnot.wine.infrastructure.ai;

import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import com.vinnot.shared.application.port.AiImageCompletionRequest;
import com.vinnot.shared.application.port.AiCompletionService;
import com.vinnot.wine.application.port.out.WineLabelRecognitionPort;
import com.vinnot.wine.domain.model.ExtractedWineLabel;
import com.vinnot.wine.infrastructure.config.WineLabelRecognitionProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Collections;
import java.util.Map;
import java.util.Objects;
import java.time.Duration;

/**
 * Multimodal provider adapter. Prompt and provider response parsing remain at
 * the infrastructure edge; the application receives a stable domain model.
 */
@Component
@ConditionalOnProperty(name = "ai.provider", havingValue = "openai")
public class OpenAiWineLabelRecognitionAdapter implements WineLabelRecognitionPort {

    private static final double TEMPERATURE = 0.0;
    private static final int MAX_OBSERVED_LINES = 24;
    private static final int MAX_OBSERVED_LINE_LENGTH = 120;
    private static final Map<String, Object> RESPONSE_SCHEMA = observationFirstSchema(Map.of(
            "type", "object",
            "additionalProperties", false,
            "required", List.of(
                    "isWineLabel", "wineryName", "wineName", "grapeVariety",
                    "vintage", "wineType", "region", "country", "alcoholContent",
                    "confidence", "searchKeywords", "visualDescription", "observedText",
                    "identitySymbols"),
            "properties", Map.ofEntries(
                    Map.entry("isWineLabel", Map.of("type", "boolean")),
                    Map.entry("wineryName", nullable("string")),
                    Map.entry("wineName", nullable("string")),
                    Map.entry("grapeVariety", nullable("string")),
                    Map.entry("vintage", nullable("integer")),
                    Map.entry("wineType", nullable("string")),
                    Map.entry("region", nullable("string")),
                    Map.entry("country", nullable("string")),
                    Map.entry("alcoholContent", nullable("number")),
                    Map.entry("confidence", Map.of(
                            "type", "number", "minimum", 0, "maximum", 1)),
                    Map.entry("searchKeywords", nullable("string")),
                    Map.entry("visualDescription", nullable("string")),
                    Map.entry("observedText", Map.of(
                            "type", "array",
                            "maxItems", MAX_OBSERVED_LINES,
                            "items", Map.of(
                                    "type", "string",
                                    "maxLength", MAX_OBSERVED_LINE_LENGTH))),
                    Map.entry("identitySymbols", Map.of(
                            "type", "array", "items", Map.of(
                                    "type", "string",
                                    "enum", List.of("+", "#", "%", "@", "*", "!", "×", "x")))))));
    private static final String PROMPT = """
            Inspect this image as a wine-label recognition system.
            Transcribe only text that is actually visible. Do not invent missing values.
            First transcribe observedText verbatim, then derive identity fields from those
            lines. Read small superscripts immediately next to the brand, and separate
            numbered product lines or vineyard/cuvee names before choosing the product.
            Return one JSON object with exactly these keys:
            {
              "isWineLabel": boolean,
              "wineryName": string|null,
              "wineName": string|null,
              "grapeVariety": string|null,
              "vintage": integer|null,
              "wineType": "RED"|"WHITE"|"ROSE"|"SPARKLING"|"DESSERT"|"FORTIFIED"|"ORANGE"|null,
              "region": string|null,
              "country": string|null,
              "alcoholContent": number|null,
              "confidence": number between 0 and 1,
              "searchKeywords": string|null,
              "visualDescription": string|null,
              "observedText": array of strings,
              "identitySymbols": array containing only "+", "#", "%", "@", "*", "!", "×" or "x"
            }
            Separate the public-facing brand/producer from the product designation:
            - wineryName is the brand, winery or producer identity. Prefer the prominent
              public-facing brand when a small legal producer name also appears.
            - wineName is the complete cuvee, line or product designation that distinguishes
              this bottle inside that brand. Include a visible varietal when it is part of
              that designation, but do not repeat wineryName merely to make a full phrase.
              Do not omit a separate numbered line or named vineyard in favor of a location.
            - grapeVariety repeats every clearly printed grape even if already in wineName.
              Do not return null for a legible varietal; do not infer grapes from appellations.
            - If hierarchy is ambiguous, use the prominent brand as wineryName and combine
              the remaining visible line/designation and varietal as wineName.
            For example, visible lines "CASA NORTE", "COLECCION LOMA", "MALBEC" map to
            wineryName "CASA NORTE" and wineName "COLECCION LOMA MALBEC".
            observedText must preserve all legible label lines in visual reading order,
            including small text, accents, native scripts and punctuation. Preserve visible
            commercial symbols such as +, #, %, @, *, ! and multiplication marks exactly;
            they can distinguish two products. Do not translate or romanize observedText
            and do not collapse distinct lines.
            identitySymbols must list every visible commercial symbol that is part of the
            brand or product identity, including small superscript marks next to a brand.
            Treat ampersand as an ordinary word separator, not as an identity symbol.
            Exclude punctuation that merely formats prose. Return an empty array when none
            is visible.
            searchKeywords must combine only distinctive visible identity text: brand or
            winery, product line/cuvee and varietal. Keep the original script and any
            identity symbol or non-vintage number. Exclude generic wine words, regions,
            countries, legal text and vintage-only values.
            Never identify a bottle from general wine knowledge or visual resemblance when
            its distinguishing text is not visible.
            visualDescription may be null; otherwise use at most twelve words about the
            layout. Prioritize identity transcription over visual prose and marketing text.
            Confidence measures extraction quality, not probability of a database match.
            """;

    private final AiCompletionService aiCompletionService;
    private final WineLabelRecognitionProperties properties;

    /** Stable schema order asks the recognizer to transcribe evidence before interpreting it. */
    @SuppressWarnings("unchecked")
    private static Map<String, Object> observationFirstSchema(Map<String, Object> schema) {
        Map<String, Object> properties = (Map<String, Object>) schema.get("properties");
        Map<String, Object> ordered = new LinkedHashMap<>();
        List<String> keys = List.of("observedText", "identitySymbols", "isWineLabel",
                "wineryName", "wineName", "grapeVariety", "vintage", "wineType",
                "region", "country", "alcoholContent", "confidence", "searchKeywords", "visualDescription");
        keys.forEach(key -> ordered.put(key, properties.get(key)));
        Map<String, Object> result = new LinkedHashMap<>(schema);
        result.put("properties", Collections.unmodifiableMap(ordered));
        result.put("required", keys);
        return Collections.unmodifiableMap(result);
    }

    public OpenAiWineLabelRecognitionAdapter(
            AiCompletionService aiCompletionService,
            WineLabelRecognitionProperties properties) {
        this.aiCompletionService = aiCompletionService;
        this.properties = properties;
    }

    @Override
    public ExtractedWineLabel recognize(byte[] imageBytes, String contentType) {
        return recognize(imageBytes, contentType, properties.timeout());
    }

    @Override
    public ExtractedWineLabel recognize(byte[] imageBytes, String contentType, Duration remaining) {
        Map<String, Object> result = aiCompletionService.structuredCompletionWithImage(
                new AiImageCompletionRequest(
                        PROMPT,
                        imageBytes,
                        contentType,
                        TEMPERATURE,
                        properties.maxTokens(),
                        "wine_label_extraction",
                        RESPONSE_SCHEMA,
                        properties.detail(),
                        properties.timeout().compareTo(remaining) < 0 ? properties.timeout() : remaining,
                        1));
        if (result.isEmpty()) {
            throw new ExternalServiceUnavailableException(
                    "LABEL_RECOGNITION_UNAVAILABLE",
                    "Wine-label recognition is temporarily unavailable",
                    null);
        }
        return new ExtractedWineLabel(
                text(result, "wineryName"),
                text(result, "wineName"),
                text(result, "grapeVariety"),
                integer(result, "vintage"),
                text(result, "wineType"),
                text(result, "region"),
                text(result, "country"),
                decimal(result, "alcoholContent"),
                number(result, "confidence"),
                text(result, "searchKeywords"),
                text(result, "visualDescription"),
                bool(result, "isWineLabel"),
                textList(result, "observedText"),
                textList(result, "identitySymbols"));
    }

    private static String text(Map<String, Object> result, String key) {
        Object value = result.get(key);
        if (Objects.isNull(value)) {
            return null;
        }
        String stringValue = String.valueOf(value).trim();
        return stringValue.isBlank() || "null".equalsIgnoreCase(stringValue)
                ? null : stringValue;
    }

    private static Integer integer(Map<String, Object> result, String key) {
        Object value = result.get(key);
        if (value instanceof Number number) {
            return number.intValue();
        }
        try {
            String stringValue = text(result, key);
            return Objects.nonNull(stringValue) ? Integer.valueOf(stringValue) : null;
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private static BigDecimal decimal(Map<String, Object> result, String key) {
        Object value = result.get(key);
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        try {
            String stringValue = text(result, key);
            return Objects.nonNull(stringValue)
                    ? new BigDecimal(stringValue.replace("%", "").trim()) : null;
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private static double number(Map<String, Object> result, String key) {
        Object value = result.get(key);
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        try {
            String stringValue = text(result, key);
            return Objects.nonNull(stringValue) ? Double.parseDouble(stringValue) : 0.0;
        } catch (NumberFormatException ignored) {
            return 0.0;
        }
    }

    private static boolean bool(Map<String, Object> result, String key) {
        Object value = result.get(key);
        return value instanceof Boolean booleanValue
                ? booleanValue
                : Boolean.parseBoolean(String.valueOf(value));
    }

    private static List<String> textList(Map<String, Object> result, String key) {
        Object value = result.get(key);
        if (!(value instanceof List<?> list)) {
            return List.of();
        }
        return list.stream()
                .filter(Objects::nonNull)
                .map(String::valueOf)
                .map(String::trim)
                .filter(item -> !item.isBlank())
                .toList();
    }

    private static Map<String, Object> nullable(String type) {
        return Map.of("type", List.of(type, "null"));
    }
}
