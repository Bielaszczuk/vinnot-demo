package com.vinnot.ai.domain.model;

import java.util.Objects;
import java.util.Optional;

/**
 * The aroma family an illustrated note belongs to (#541), the grouping a member's taste profile shows. Dried fruit,
 * jam, honey, molasses and bread belong to no family.
 */
public enum SensoryFamily {
    FRUIT,
    FLORAL,
    HERBAL,
    SPICE,
    OAK,
    MINERAL;

    /** The note's family; the switch names every note, so a new note cannot be left out by accident. */
    public static Optional<SensoryFamily> of(SensoryNote note) {
        if (Objects.isNull(note)) {
            return Optional.empty();
        }
        SensoryFamily family = switch (note) {
            case GREEN_APPLE, RASPBERRY, STRAWBERRY, BLACK_CHERRY, CHERRY, BLACKBERRY, GOOSEBERRY, BLACKCURRANT,
                    RED_CURRANT, BLUEBERRY, PLUM, FIG, BERGAMOT, LIME, LEMON, ORANGE, GRAPEFRUIT, APPLE, PEAR,
                    APRICOT, PEACH, QUINCE, PASSION_FRUIT, PINEAPPLE, LYCHEE, RED_GRAPE, GRAPE, WHITE_MELON, MELON,
                    POMEGRANATE, MIXED_FRUIT -> FRUIT;
            case HONEYSUCKLE, WHITE_FLOWERS, CHAMOMILE, ROSE, VIOLET -> FLORAL;
            case ROASTED_PEPPER, RED_PEPPER, GREEN_PEPPER, DRIED_HERBS, TOMATO_LEAF, DRIED_LEAF, BAY_LEAF, FRESH_HERBS,
                    TEA, BLACK_OLIVE -> HERBAL;
            case SWEET_SPICE, GINGER, ANISE, WHITE_PEPPER, BLACK_PEPPER -> SPICE;
            case VANILLA, COFFEE, CHOCOLATE, OAK, SMOKE, TOBACCO, NUTS, BUTTER, CARAMEL -> SensoryFamily.OAK;
            case MINERAL, SALINE, WET_EARTH, LEATHER -> SensoryFamily.MINERAL;
            case DRIED_FRUIT, JAM, HONEY, MOLASSES, BREAD -> null;
        };
        return Optional.ofNullable(family);
    }
}
