package com.vinnot.wine.domain.service;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Provider-independent normalization for public wine and producer identities.
 * It deliberately works with complete tokens, never arbitrary string prefixes.
 */
public final class WineLabelIdentityNormalizer {

    private static final double CONTAINMENT_SIMILARITY = 0.88;
    private static final double DISTINCTIVE_CONTAINMENT_SIMILARITY = 0.96;
    private static final double EDIT_SIMILARITY_WEIGHT = 0.65;
    private static final double TOKEN_SIMILARITY_WEIGHT = 0.35;
    private static final double SCORE_PRECISION = 10_000.0;
    private static final int DISTINCTIVE_TEXT_MIN_LENGTH = 8;
    private static final int EARLIEST_PLAUSIBLE_VINTAGE = 1900;
    private static final int LATEST_PLAUSIBLE_VINTAGE = 2099;
    private static final Pattern COMBINING_MARKS = Pattern.compile("\\p{M}+");
    private static final Pattern DIGIT_MULTIPLIER = Pattern.compile("(?<=\\d)x(?=\\d)");
    private static final Pattern NON_ALPHANUMERIC = Pattern.compile("[^\\p{L}\\p{N}]+");
    private static final Pattern WHITESPACE = Pattern.compile("\\s+");
    private static final Pattern DIGITS = Pattern.compile("\\d+");
    private static final Pattern FOUR_DIGITS = Pattern.compile("\\d{4}");
    private static final Pattern NUMBERED_PRODUCT = Pattern.compile("\\d{1,4} [\\p{L}].*");
    private static final Pattern MEASUREMENT = Pattern.compile(".*\\b(?:m|mts|mt|metros|metres|meters|altitud|altitude"
            + "|feet|ft|ml|cl|abv|vol|alcohol|alc|m s n m|m a s l|msnm|masl)\\b.*");
    /**
     * Scoring normalizes the same label lines and catalog names once per candidate; a scan ranks hundreds of
     * candidates. Results are pure functions of the text, so they are kept up to this many distinct values.
     */
    static final int MEMO_LIMIT = 8_192;
    private static final Map<String, String> NORMALIZED = new ConcurrentHashMap<>();
    private static final Map<String, Set<String>> SIGNIFICANT_TOKENS = new ConcurrentHashMap<>();
    private static final Pattern MULTIPLICATIVE_IDENTIFIER = Pattern.compile(
            "(?:^| )(\\d+(?: x \\d+)+)(?: |$)");

    private static final Set<String> IDENTITY_STOP_WORDS =
            WineLabelLanguageVocabulary.allStopWords();
    private static final Set<String> PRODUCER_DESIGNATORS =
            WineLabelLanguageVocabulary.allProducerDesignators();

    private WineLabelIdentityNormalizer() {
    }

    public static String normalize(String value) {
        if (!hasText(value)) {
            return "";
        }
        return memoized(NORMALIZED, value, WineLabelIdentityNormalizer::computeNormalized);
    }

    private static String computeNormalized(String value) {
        String compatible = WineLabelUnicodeCompatibility.transliterate(value);
        String withoutMarks = COMBINING_MARKS.matcher(Normalizer.normalize(compatible, Normalizer.Form.NFKD))
                .replaceAll("")
                .toLowerCase(Locale.ROOT)
                .replace('×', 'x');
        String spaced = DIGIT_MULTIPLIER.matcher(withoutMarks).replaceAll(" x ").replace('&', ' ');
        return WHITESPACE.matcher(NON_ALPHANUMERIC.matcher(spaced).replaceAll(" ")).replaceAll(" ").trim();
    }

    private static <V> V memoized(Map<String, V> memo, String value, Function<String, V> compute) {
        V cached = memo.get(value);
        if (Objects.nonNull(cached)) {
            return cached;
        }
        V computed = compute.apply(value);
        if (memo.size() >= MEMO_LIMIT) {
            memo.clear();
        }
        memo.put(value, computed);
        return computed;
    }

    public static Set<String> significantTokens(String value) {
        if (Objects.isNull(value)) {
            return Set.of();
        }
        return memoized(SIGNIFICANT_TOKENS, value, WineLabelIdentityNormalizer::computeSignificantTokens);
    }

    private static Set<String> computeSignificantTokens(String value) {
        // Preserve the descriptor as evidence across translated catalog names;
        // do not remove it or inject it when the label does not show it.
        Set<String> tokens = searchTokens(value).stream()
                .map(token -> switch (token) {
                    case "organico", "organica", "organique" -> "organic";
                    default -> token;
                }).collect(Collectors.toCollection(LinkedHashSet::new));
        tokens.addAll(WineLabelIdentitySymbol.tokens(value));
        return Set.copyOf(tokens);
    }

    public static Set<String> symbolDiscriminatorTokens(String value) {
        return Set.copyOf(WineLabelIdentitySymbol.discriminatorTokens(value));
    }

    /**
     * Commercial identifiers carry more identity than ordinary descriptive
     * words. This includes explicit symbols and non-vintage numeric product
     * numbers such as 1492, 007 or 100 in "100 X 100".
     */
    public static Set<String> identityDiscriminatorTokens(String value) {
        Set<String> tokens = new LinkedHashSet<>(symbolDiscriminatorTokens(value));
        searchTokens(value).stream()
                .filter(token -> DIGITS.matcher(token).matches())
                .map(token -> "__number_" + token + "__")
                .forEach(tokens::add);
        return Set.copyOf(tokens);
    }

    /**
     * Persistence-safe commercial identifiers. Compound numeric identities are
     * kept as phrases so a short component such as "100" cannot flood the
     * candidate prefilter with unrelated catalog rows.
     */
    public static List<String> commercialIdentifierSearchTerms(String value) {
        String normalized = normalize(value);
        Matcher matcher = MULTIPLICATIVE_IDENTIFIER.matcher(normalized);
        Set<String> compoundTerms = new LinkedHashSet<>();
        while (matcher.find()) {
            compoundTerms.add(matcher.group(1));
        }
        if (!compoundTerms.isEmpty()) {
            return List.copyOf(compoundTerms);
        }
        return searchTokens(value).stream()
                .filter(token -> DIGITS.matcher(token).matches())
                .toList();
    }

    /**
     * Lexical identity tokens suitable for persistence searches. Symbol
     * discriminators stay in {@link #significantTokens(String)} because their
     * stable internal representation must never leak into SQL search terms.
     */
    public static List<String> searchTokens(String value) {
        String normalized = normalize(value);
        if (normalized.isBlank()) {
            return List.of();
        }
        Set<String> tokens = new LinkedHashSet<>(Arrays.asList(normalized.split(" ")));
        tokens.removeIf(token -> !isSearchableToken(token)
                || IDENTITY_STOP_WORDS.contains(token));
        return List.copyOf(tokens);
    }

    public static boolean isPlausibleVintage(String value) {
        if (!hasText(value) || !FOUR_DIGITS.matcher(value).matches()) {
            return false;
        }
        int numericValue = Integer.parseInt(value);
        return numericValue >= EARLIEST_PLAUSIBLE_VINTAGE
                && numericValue <= LATEST_PLAUSIBLE_VINTAGE;
    }

    /** Numeric product designations, not vintages or measurement lines. */
    public static boolean isNumberedProductLine(String line) {
        String normalized = normalize(line);
        return NUMBERED_PRODUCT.matcher(normalized).matches()
                && !isMeasurementLine(line)
                && !commercialIdentifierSearchTerms(line).isEmpty();
    }

    public static boolean isMeasurementLine(String line) {
        return MEASUREMENT.matcher(normalize(line)).matches();
    }

    public static Set<String> producerTokens(String value) {
        Set<String> tokens = new LinkedHashSet<>(significantTokens(value));
        tokens.removeAll(PRODUCER_DESIGNATORS);
        return Set.copyOf(tokens);
    }

    /** The producer's distinctive words in printed order: "Bodega Mevi" becomes "mevi". */
    public static String producerCore(String value) {
        return searchTokens(value).stream()
                .filter(token -> !PRODUCER_DESIGNATORS.contains(token))
                .collect(Collectors.joining(" "));
    }

    /**
     * Whether a line only repeats generic designations or already-known context (grape, region, country,
     * type), such as "Edición Limitada" or "Estate Grown Viognier".
     */
    public static boolean isGenericDesignationOnly(String value, Collection<String> context) {
        Set<String> tokens = new HashSet<>(significantTokens(value));
        if (tokens.isEmpty()) {
            return false;
        }
        tokens.removeAll(WineLabelLanguageVocabulary.genericDesignations());
        context.stream().filter(Objects::nonNull).forEach(known -> tokens.removeAll(significantTokens(known)));
        return tokens.isEmpty();
    }

    public static double textSimilarity(String left, String right) {
        String normalizedLeft = normalize(left);
        String normalizedRight = normalize(right);
        if (normalizedLeft.isBlank() || normalizedRight.isBlank()) {
            return 0.0;
        }
        if (normalizedLeft.equals(normalizedRight)) {
            return 1.0;
        }

        double editSimilarity = normalizedEditSimilarity(normalizedLeft, normalizedRight);
        double tokenSimilarity = tokenJaccard(normalizedLeft, normalizedRight);
        boolean contained = containsCompleteTokenSequence(normalizedLeft, normalizedRight)
                || containsCompleteTokenSequence(normalizedRight, normalizedLeft);
        double containment = contained
                ? containmentSimilarity(normalizedLeft, normalizedRight)
                : 0.0;
        return round(Math.max(containment,
                (editSimilarity * EDIT_SIMILARITY_WEIGHT)
                        + (tokenSimilarity * TOKEN_SIMILARITY_WEIGHT)));
    }

    public static double producerSimilarity(String left, String right) {
        String compactLeft = normalize(left).replace(" ", "");
        String compactRight = normalize(right).replace(" ", "");
        if (compactLeft.length() >= DISTINCTIVE_TEXT_MIN_LENGTH && compactLeft.equals(compactRight)) {
            // OCR may split a printed brand across words/lines. Require the
            // complete character sequence, never a prefix or a partial brand.
            return 1.0;
        }
        double direct = textSimilarity(left, right);
        String leftCore = String.join(" ", producerTokens(left).stream().sorted().toList());
        String rightCore = String.join(" ", producerTokens(right).stream().sorted().toList());
        return Math.max(direct, textSimilarity(leftCore, rightCore));
    }

    public static double coverage(Set<String> expected, Set<String> available) {
        if (expected.isEmpty()) {
            return 0.0;
        }
        long matches = expected.stream().filter(available::contains).count();
        return round((double) matches / expected.size());
    }

    public static double jaccard(Set<String> left, Set<String> right) {
        if (left.isEmpty() || right.isEmpty()) {
            return 0.0;
        }
        Set<String> intersection = new HashSet<>(left);
        intersection.retainAll(right);
        Set<String> union = new HashSet<>(left);
        union.addAll(right);
        return round((double) intersection.size() / union.size());
    }

    private static boolean containsCompleteTokenSequence(String container, String candidate) {
        List<String> containerTokens = new ArrayList<>(Arrays.asList(container.split(" ")));
        List<String> candidateTokens = new ArrayList<>(Arrays.asList(candidate.split(" ")));
        if (candidateTokens.size() > containerTokens.size()) {
            return false;
        }
        for (int start = 0; start <= containerTokens.size() - candidateTokens.size(); start++) {
            if (containerTokens.subList(start, start + candidateTokens.size())
                    .equals(candidateTokens)) {
                return true;
            }
        }
        return false;
    }

    private static double containmentSimilarity(String left, String right) {
        String shorter = left.length() <= right.length() ? left : right;
        return normalize(shorter).replace(" ", "").length() >= DISTINCTIVE_TEXT_MIN_LENGTH
                ? DISTINCTIVE_CONTAINMENT_SIMILARITY
                : CONTAINMENT_SIMILARITY;
    }

    private static double normalizedEditSimilarity(String left, String right) {
        int[] previous = new int[right.length() + 1];
        int[] current = new int[right.length() + 1];
        for (int column = 0; column <= right.length(); column++) {
            previous[column] = column;
        }
        for (int row = 1; row <= left.length(); row++) {
            current[0] = row;
            for (int column = 1; column <= right.length(); column++) {
                int substitution = left.charAt(row - 1) == right.charAt(column - 1) ? 0 : 1;
                current[column] = Math.min(
                        Math.min(current[column - 1] + 1, previous[column] + 1),
                        previous[column - 1] + substitution);
            }
            int[] swap = previous;
            previous = current;
            current = swap;
        }
        int distance = previous[right.length()];
        return 1.0 - ((double) distance / Math.max(left.length(), right.length()));
    }

    private static double tokenJaccard(String left, String right) {
        return jaccard(
                new HashSet<>(Arrays.asList(left.split(" "))),
                new HashSet<>(Arrays.asList(right.split(" "))));
    }

    private static boolean hasText(String value) {
        return Objects.nonNull(value) && !value.isBlank();
    }

    private static boolean isSearchableToken(String token) {
        if (token.length() < 2 && !"x".equals(token)) {
            return false;
        }
        return !isPlausibleVintage(token);
    }

    private static double round(double value) {
        return Math.round(value * SCORE_PRECISION) / SCORE_PRECISION;
    }
}
