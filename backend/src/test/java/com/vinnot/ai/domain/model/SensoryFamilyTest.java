package com.vinnot.ai.domain.model;

import org.junit.jupiter.api.Test;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/** #541 S9: the aroma family each illustrated note belongs to. */
class SensoryFamilyTest {

    @Test
    void everyNoteBelongsToTheFamilyTheTasteProfileMapGivesIt() {
        assertFamily(SensoryFamily.FLORAL, SensoryNote.HONEYSUCKLE, SensoryNote.WHITE_FLOWERS, SensoryNote.CHAMOMILE,
                SensoryNote.ROSE, SensoryNote.VIOLET);
        assertFamily(SensoryFamily.HERBAL, SensoryNote.ROASTED_PEPPER, SensoryNote.RED_PEPPER,
                SensoryNote.GREEN_PEPPER, SensoryNote.DRIED_HERBS, SensoryNote.TOMATO_LEAF, SensoryNote.DRIED_LEAF,
                SensoryNote.BAY_LEAF, SensoryNote.FRESH_HERBS, SensoryNote.TEA, SensoryNote.BLACK_OLIVE);
        assertFamily(SensoryFamily.SPICE, SensoryNote.SWEET_SPICE, SensoryNote.GINGER, SensoryNote.ANISE,
                SensoryNote.WHITE_PEPPER, SensoryNote.BLACK_PEPPER);
        assertFamily(SensoryFamily.OAK, SensoryNote.VANILLA, SensoryNote.COFFEE, SensoryNote.CHOCOLATE,
                SensoryNote.OAK, SensoryNote.SMOKE, SensoryNote.TOBACCO, SensoryNote.NUTS, SensoryNote.BUTTER,
                SensoryNote.CARAMEL);
        assertFamily(SensoryFamily.MINERAL, SensoryNote.MINERAL, SensoryNote.SALINE, SensoryNote.WET_EARTH,
                SensoryNote.LEATHER);
        Set<SensoryNote> unmapped = EnumSet.of(SensoryNote.DRIED_FRUIT, SensoryNote.JAM, SensoryNote.HONEY,
                SensoryNote.MOLASSES, SensoryNote.BREAD);
        Set<SensoryNote> otherFamilies = Stream.of(SensoryFamily.FLORAL, SensoryFamily.HERBAL, SensoryFamily.SPICE,
                SensoryFamily.OAK, SensoryFamily.MINERAL).flatMap(family -> notesOf(family).stream())
                .collect(Collectors.toSet());
        Set<SensoryNote> fruit = EnumSet.allOf(SensoryNote.class);
        fruit.removeAll(unmapped);
        fruit.removeAll(otherFamilies);
        assertThat(fruit).contains(SensoryNote.MIXED_FRUIT, SensoryNote.CHERRY, SensoryNote.LEMON,
                SensoryNote.GREEN_APPLE, SensoryNote.POMEGRANATE, SensoryNote.RED_GRAPE);
        assertThat(notesOf(SensoryFamily.FRUIT)).containsExactlyInAnyOrderElementsOf(fruit);
    }

    @Test
    void driedFruitJamHoneyMolassesAndBreadBelongToNoFamily() {
        for (SensoryNote note : List.of(SensoryNote.DRIED_FRUIT, SensoryNote.JAM, SensoryNote.HONEY,
                SensoryNote.MOLASSES, SensoryNote.BREAD)) {
            assertThat(SensoryFamily.of(note)).as(note.name()).isEmpty();
        }
        assertThat(SensoryFamily.of(null)).isEmpty();
    }

    private static void assertFamily(SensoryFamily family, SensoryNote... notes) {
        assertThat(notesOf(family)).containsExactlyInAnyOrder(notes);
    }

    private static Set<SensoryNote> notesOf(SensoryFamily family) {
        return Stream.of(SensoryNote.values())
                .filter(note -> SensoryFamily.of(note).filter(family::equals).isPresent())
                .collect(Collectors.toCollection(() -> EnumSet.noneOf(SensoryNote.class)));
    }
}
