package com.vinnot.community.domain.model;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Keys for grape names written in any script or case (#541 S15): "Agiorgitiko", "ΑΓΙΩΡΓΙΤΙΚΟ" and "Αγιωργίτικο" are
 * one grape. Greek is romanised after ELOT 743 (the Greek standard): ου is "ou", αυ/ευ/ηυ are "av"/"ev"/"iv" before a
 * voiced sound and "af"/"ef"/"if" before a voiceless one or at the end, μπ/ντ/γκ are "b"/"d"/"g" at the start of a
 * word and "mb"/"nt"/"nk" inside it, γγ is "ng", and a diaeresis splits a pair.
 */
public final class GrapeName {
    private static final char DIAERESIS = '̈';
    private static final Pattern WHITESPACE = Pattern.compile("\\s+");
    private static final Pattern MARK = Pattern.compile("\\p{M}");
    private static final Pattern DOUBLED_LETTER = Pattern.compile("(\\p{L})\\1+");
    private static final Pattern WORD_START = Pattern.compile("(^|[ -])(\\p{L})");
    private static final Map<Character, String> LETTERS = Map.ofEntries(
            Map.entry('α', "a"), Map.entry('β', "v"), Map.entry('γ', "g"), Map.entry('δ', "d"), Map.entry('ε', "e"),
            Map.entry('ζ', "z"), Map.entry('η', "i"), Map.entry('θ', "th"), Map.entry('ι', "i"), Map.entry('κ', "k"),
            Map.entry('λ', "l"), Map.entry('μ', "m"), Map.entry('ν', "n"), Map.entry('ξ', "x"), Map.entry('ο', "o"),
            Map.entry('π', "p"), Map.entry('ρ', "r"), Map.entry('σ', "s"), Map.entry('ς', "s"), Map.entry('τ', "t"),
            Map.entry('υ', "y"), Map.entry('φ', "f"), Map.entry('χ', "ch"), Map.entry('ψ', "ps"), Map.entry('ω', "o"));
    /** Vowels that, followed by υ, read as a vowel and a v or f sound. */
    private static final Set<Character> V_PAIR_VOWELS = Set.of('α', 'ε', 'η');
    /** Letters before which αυ, ευ and ηυ sound like af, ef and if. */
    private static final Set<Character> VOICELESS = Set.of('θ', 'κ', 'ξ', 'π', 'σ', 'ς', 'τ', 'φ', 'χ', 'ψ');
    /** Pairs read as b, d and g at the start of a word. */
    private static final Map<String, String> NASAL_PAIRS_AT_START = Map.of("μπ", "b", "ντ", "d", "γκ", "g");
    /** The same pairs inside a word. */
    private static final Map<String, String> NASAL_PAIRS_INSIDE = Map.of("μπ", "mb", "ντ", "nt", "γκ", "nk");
    /** Pairs whose first γ is an n sound. */
    private static final Map<String, String> GAMMA_PAIRS = Map.of("γγ", "ng", "γξ", "nx", "γχ", "nch");

    private GrapeName() {
    }

    /** The key of a spelling: trimmed, single-spaced, lower case, without accents and with Greek romanised. */
    public static String normalize(String spelling) {
        String lower = WHITESPACE.matcher(spelling.strip()).replaceAll(" ").toLowerCase(Locale.ROOT);
        return romanise(Normalizer.normalize(lower, Normalizer.Form.NFD));
    }

    /**
     * The key two spellings are matched on: {@link #normalize} without doubled letters, because romanisations double
     * consonants freely (Latin "Assyrtiko" for Greek "Ασύρτικο", "Savatiano" for "Σαββατιανό").
     */
    public static String matchKey(String spelling) {
        return DOUBLED_LETTER.matcher(normalize(spelling)).replaceAll("$1");
    }

    /** Whether every letter of the spelling belongs to the Latin script. */
    public static boolean isLatinScript(String spelling) {
        return spelling.codePoints().filter(Character::isLetter)
                .allMatch(point -> Character.UnicodeScript.of(point) == Character.UnicodeScript.LATIN);
    }

    /** The key with the first letter of every word, after a space or a hyphen, in upper case. */
    public static String titleCase(String key) {
        return WORD_START.matcher(key).replaceAll(match ->
                Matcher.quoteReplacement(match.group(1) + match.group(2).toUpperCase(Locale.ROOT)));
    }

    /** Romanises the Greek letters of a decomposed lower-case text and drops every accent mark. */
    private static String romanise(String decomposed) {
        List<Character> letters = new ArrayList<>();
        List<Boolean> splits = new ArrayList<>();
        for (char character : decomposed.toCharArray()) {
            if (character == DIAERESIS && !letters.isEmpty()) {
                splits.set(splits.size() - 1, true);
            } else if (!MARK.matcher(String.valueOf(character)).matches()) {
                letters.add(character);
                splits.add(false);
            }
        }
        StringBuilder out = new StringBuilder();
        int index = 0;
        while (index < letters.size()) {
            index += append(out, letters, splits, index);
        }
        return out.toString();
    }

    /**
     * Appends the romanisation of the letter at {@code index}, or of the pair it starts, and returns how many letters
     * it read. A letter followed by one carrying a diaeresis never starts a pair.
     */
    private static int append(StringBuilder out, List<Character> letters, List<Boolean> splits, int index) {
        char letter = letters.get(index);
        if (index + 1 < letters.size() && !splits.get(index + 1)) {
            String pair = romanisePair(letters, index);
            if (!pair.isEmpty()) {
                out.append(pair);
                return 2;
            }
        }
        out.append(LETTERS.getOrDefault(letter, String.valueOf(letter)));
        return 1;
    }

    /** The romanisation of the pair starting at {@code index}, or an empty text when the two letters are no pair. */
    private static String romanisePair(List<Character> letters, int index) {
        char letter = letters.get(index);
        char next = letters.get(index + 1);
        String pair = "" + letter + next;
        if (letter == 'ο' && next == 'υ') {
            return "ou";
        }
        if (V_PAIR_VOWELS.contains(letter) && next == 'υ') {
            boolean voiceless = index + 2 >= letters.size() || VOICELESS.contains(letters.get(index + 2))
                    || !Character.isLetter(letters.get(index + 2));
            return LETTERS.get(letter) + (voiceless ? "f" : "v");
        }
        if (NASAL_PAIRS_AT_START.containsKey(pair)) {
            boolean wordStart = index == 0 || !Character.isLetter(letters.get(index - 1));
            return (wordStart ? NASAL_PAIRS_AT_START : NASAL_PAIRS_INSIDE).get(pair);
        }
        return GAMMA_PAIRS.getOrDefault(pair, "");
    }
}
