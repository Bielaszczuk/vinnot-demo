package com.vinnot.ai.application.service;

import com.vinnot.ai.domain.valueobject.AiContentLanguage;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Predicate;

/** Local, bounded contract checks; never calls a provider or rewrites a wine's narrative. */
@Service
public class WineComparisonContentValidator {

    private static final int MAX_LIST_ITEMS = 6;
    private static final int MAX_ATTRIBUTES = 8;
    private static final int MAX_TEXT_LENGTH = 2000;
    private static final List<String> NARRATIVE_FIELDS = List.of(
            "summary", "recommendation", "recommendationWineA", "recommendationWineB");
    private static final List<String> SIDES = List.of("wineA", "wineB");
    private static final List<String> TASTING_NOTE_FIELDS = List.of(
            "identity", "appearance", "nose", "palate", "finish");
    private static final Set<String> PICKS = Set.of("A", "B");
    // Historical prompt literals, retained only to reject contaminated cache/provider content.
    private static final Set<String> PLACEHOLDERS = Set.of(
            "diferencia estructural principal", "diferencia en el perfil de sabor",
            "diferencia de terroir o estilo", "major structural difference",
            "flavor profile distinction", "terroir or style difference",
            "caracteristica concreta que comparten como variedad region tecnica o potencial de guarda",
            "concrete shared trait such as variety region technique or aging potential",
            "valor descriptivo", "descriptive value", "ocasion 1", "ocasion 2", "occasion 1", "occasion 2",
            "una conclusion breve con el veredicto general", "one short concluding sentence with the overall verdict",
            "cuando y por que elegir el vino a usando su nombre real",
            "cuando y por que elegir el vino b usando su nombre real",
            "when and why to choose wine a using its real name", "when and why to choose wine b using its real name",
            "2 3 oraciones sobre el caracter de cada vino y su diferencia principal",
            "2 3 sentences about each wines character and their main difference");

    /** Accepts legacy attribute layouts (the response normalizer handles them) but requires the v9 sections. */
    public boolean isReusable(Map<String, Object> content) {
        if (Objects.isNull(content) || !NARRATIVE_FIELDS.stream().allMatch(key -> text(content.get(key)))
                || !texts(content.get("keyDifferences")) || !texts(content.get("similarities"))) {
            return false;
        }
        String summary = normalize((String) content.get("summary"));
        if (summary.startsWith("comparacion profesional entre")
                && summary.contains("el primero destaca por su estructura y complejidad")
                || summary.startsWith("professional comparison between")
                && summary.contains("the first stands out for structure and complexity")) {
            return false;
        }
        return content.get("bestFor") instanceof Map<?, ?> bestFor
                && texts(bestFor.get("wineA")) && texts(bestFor.get("wineB"))
                && content.get("attributeComparison") instanceof Map<?, ?> comparison
                && comparison.get("attributes") instanceof List<?> attributes
                && !attributes.isEmpty() && attributes.size() <= MAX_ATTRIBUTES
                && attributes.stream().allMatch(this::attribute)
                && wineSpecificSections(content);
    }

    /** The wine-specific sections are required, so content lacking them regenerates instead of being reused. */
    private boolean wineSpecificSections(Map<String, Object> content) {
        return perWine(content.get("tastingNotes"), note -> note instanceof Map<?, ?> fields
                        && TASTING_NOTE_FIELDS.stream().allMatch(field -> text(fields.get(field))))
                && items(content.get("chooseIf"), choice -> choice instanceof Map<?, ?> fields
                        && fields.get("pick") instanceof String pick && PICKS.contains(pick)
                        && text(fields.get("situation")) && text(fields.get("why")))
                && perWine(content.get("pairings"), dishes -> items(dishes, this::pairing))
                && content.get("pairings") instanceof Map<?, ?> pairings
                && (Objects.isNull(pairings.get("shared")) || pairing(pairings.get("shared")))
                && perWine(content.get("serving"), serving -> serving instanceof Map<?, ?> fields
                        && text(fields.get("temperature"))
                        && (Objects.isNull(fields.get("decanting")) || text(fields.get("decanting"))))
                && perWine(content.get("aging"), this::text)
                && (Objects.isNull(content.get("value")) || text(content.get("value")));
    }

    private boolean perWine(Object value, Predicate<Object> side) {
        return value instanceof Map<?, ?> sides && SIDES.stream().allMatch(key -> side.test(sides.get(key)));
    }

    private boolean items(Object value, Predicate<Object> item) {
        return value instanceof List<?> values && values.size() <= MAX_LIST_ITEMS && values.stream().allMatch(item);
    }

    private boolean pairing(Object value) {
        return value instanceof Map<?, ?> fields && text(fields.get("dish")) && text(fields.get("why"));
    }

    /** Editorial preferences belong in the prompt, not in the availability contract. */
    boolean isValid(MultilingualAiContent bundle) {
        return Arrays.stream(AiContentLanguage.values())
                .allMatch(language -> isReusable(bundle.content(language)));
    }

    private boolean attribute(Object value) {
        return value instanceof Map<?, ?> row && text(row.get("name"))
                && text(row.get("wineAValue")) && text(row.get("wineBValue"))
                && score(row.get("wineAScore")) && score(row.get("wineBScore"));
    }

    private boolean score(Object value) {
        return Objects.isNull(value) || value instanceof Number number
                && Double.isFinite(number.doubleValue()) && number.doubleValue() >= 0 && number.doubleValue() <= 100;
    }

    private boolean texts(Object value) {
        if (!(value instanceof List<?> values) || values.size() > MAX_LIST_ITEMS) {
            return false;
        }
        return values.stream().allMatch(this::text);
    }

    private boolean text(Object value) {
        return value instanceof String string && !string.isBlank() && string.length() <= MAX_TEXT_LENGTH
                && !PLACEHOLDERS.contains(normalize(string));
    }

    private String normalize(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFKD).replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT).replaceAll("[^\\p{L}\\p{N}]+", " ").strip();
    }
}
