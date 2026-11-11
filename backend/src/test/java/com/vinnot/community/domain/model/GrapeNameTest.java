package com.vinnot.community.domain.model;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** #541 S15: one key per grape whatever the script, the case or the accents it is written in. */
class GrapeNameTest {

    @Test
    void greekSpellingsInAnyCaseAccentOrMixedScriptNormaliseToTheLatinKey() {
        assertThat(GrapeName.normalize("Agiorgitiko")).isEqualTo("agiorgitiko");
        assertThat(GrapeName.normalize("ΑΓΙΩΡΓΙΤΙΚΟ")).isEqualTo("agiorgitiko");
        assertThat(GrapeName.normalize("Αγιωργίτικο")).isEqualTo("agiorgitiko");
        // A Latin "A" followed by Greek letters, as stored in the catalog.
        assertThat(GrapeName.normalize("Aγιωργιτικο")).isEqualTo("agiorgitiko");
        assertThat(GrapeName.normalize("ασύρτικο")).isEqualTo("asyrtiko");
    }

    @Test
    void latinSpellingsAreLowerCasedTrimmedAndLoseTheirAccents() {
        assertThat(GrapeName.normalize("  Torrontés   Riojano ")).isEqualTo("torrontes riojano");
        assertThat(GrapeName.normalize("Grüner Veltliner")).isEqualTo("gruner veltliner");
        assertThat(GrapeName.normalize("MALBEC")).isEqualTo("malbec");
    }

    @Test
    void greekDigraphsFollowTheUsualRomanisation() {
        assertThat(GrapeName.normalize("Ξινόμαυρο")).isEqualTo("xinomavro");
        assertThat(GrapeName.normalize("Μοσχοφίλερο")).isEqualTo("moschofilero");
        assertThat(GrapeName.normalize("Μαλαγουζιά")).isEqualTo("malagouzia");
        assertThat(GrapeName.normalize("Ευκαλυπτος")).isEqualTo("efkalyptos");
        assertThat(GrapeName.normalize("ναυ")).isEqualTo("naf");
        assertThat(GrapeName.normalize("Ρομπόλα")).isEqualTo("rombola");
        assertThat(GrapeName.normalize("Μπάρμπα")).isEqualTo("barmba");
        assertThat(GrapeName.normalize("Ντόπιο Αντίο")).isEqualTo("dopio antio");
        assertThat(GrapeName.normalize("Αγγελική Γκρίζο Αγκαθι")).isEqualTo("angeliki grizo ankathi");
        assertThat(GrapeName.normalize("λυγξ ελεγχος ψαθα ζηβδ")).isEqualTo("lynx elenchos psatha zivd");
        // A diaeresis splits the pair: ο-ϋ and α-ϋ are read letter by letter.
        assertThat(GrapeName.normalize("προϋπο ταϋ")).isEqualTo("proypo tay");
        assertThat(GrapeName.normalize("ς φ")).isEqualTo("s f");
        assertThat(GrapeName.normalize("\u0308αι")).isEqualTo("ai");
    }

    @Test
    void theMatchKeyAlsoIgnoresDoubledLettersSoLatinAndGreekRomanisationsMeet() {
        assertThat(GrapeName.matchKey("Assyrtiko")).isEqualTo(GrapeName.matchKey("Ασύρτικο")).isEqualTo("asyrtiko");
        assertThat(GrapeName.matchKey("Savatiano")).isEqualTo(GrapeName.matchKey("Σαββατιανό"));
        assertThat(GrapeName.matchKey("Nebbiolo")).isEqualTo("nebiolo");
    }

    @Test
    void onlySpellingsWhoseLettersAreAllLatinCountAsLatinScript() {
        assertThat(GrapeName.isLatinScript("Cabernet Sauvignon 100%")).isTrue();
        assertThat(GrapeName.isLatinScript("Torrontés")).isTrue();
        assertThat(GrapeName.isLatinScript("Aγιωργιτικο")).isFalse();
        assertThat(GrapeName.isLatinScript("ΑΓΙΩΡΓΙΤΙΚΟ")).isFalse();
    }

    @Test
    void titleCaseCapitalisesEveryWordOfAKey() {
        assertThat(GrapeName.titleCase("asyrtiko")).isEqualTo("Asyrtiko");
        assertThat(GrapeName.titleCase("cabernet sauvignon")).isEqualTo("Cabernet Sauvignon");
        assertThat(GrapeName.titleCase("garnacha tintorera-x")).isEqualTo("Garnacha Tintorera-X");
    }
}
