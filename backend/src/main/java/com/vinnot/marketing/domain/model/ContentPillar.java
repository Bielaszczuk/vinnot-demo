package com.vinnot.marketing.domain.model;

import java.util.Objects;

/**
 * A kind of post the planner rotates (#489). {@link #WINE_DAY} is reserved for wine-day posts and {@link #APP_FEATURE}
 * is placed once every four rotating posts; the brief describes the format, in Spanish ({@code brief}) and in English
 * ({@code briefEn}, #497, the one the copy prompt quotes). A pillar with {@code autoApprove} lets the system approve its
 * pending posts (#510, off by default). The planner only plans {@code active} pillars; the admin may switch one off (#510).
 */
public record ContentPillar(String code, String nameEs, String nameEn, int weight, String brief, String briefEn, int sortOrder,
        boolean autoApprove, boolean active) {
    public static final String WINE_DAY = "WINE_DAY";
    public static final String APP_FEATURE = "APP_FEATURE";

    public ContentPillar {
        Objects.requireNonNull(code, "code");
        Objects.requireNonNull(nameEs, "nameEs");
        Objects.requireNonNull(nameEn, "nameEn");
        Objects.requireNonNull(brief, "brief");
        Objects.requireNonNull(briefEn, "briefEn");
        if (weight < 1) {
            throw new IllegalArgumentException("Weight must be at least 1, got " + weight);
        }
    }

    /** An active pillar that does not auto-approve. */
    public ContentPillar(String code, String nameEs, String nameEn, int weight, String brief, String briefEn, int sortOrder) {
        this(code, nameEs, nameEn, weight, brief, briefEn, sortOrder, false);
    }

    /** An active pillar. */
    public ContentPillar(String code, String nameEs, String nameEn, int weight, String brief, String briefEn, int sortOrder,
            boolean autoApprove) {
        this(code, nameEs, nameEn, weight, brief, briefEn, sortOrder, autoApprove, true);
    }

    public boolean rotates() {
        return !WINE_DAY.equals(code);
    }
}
