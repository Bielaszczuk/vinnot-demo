package com.vinnot.wine.domain.model;

import java.util.Arrays;
import java.util.Objects;

/**
 * Reasons the automatic review records without a human reviewer. The stored text stays exactly as before
 * (moderators read it in the admin queue); the code lets notifications show localized copy instead.
 */
public enum WineSubmissionSystemReason {
    AUTO_APPROVED("Automatically approved"),
    CATALOG_MATCH("Existing catalog match"),
    CHECKS_PASSED("Content safety and wine relevance passed"),
    NOT_A_WINE_LABEL("The image does not appear to be a wine label"),
    RECOGNITION_UNAVAILABLE("Wine-label recognition was unavailable"),
    MODERATION_UNAVAILABLE("Content moderation was unavailable"),
    VALIDATION_UNAVAILABLE("La validación automática no está disponible"),
    LOW_CONFIDENCE("No hay suficiente certeza para publicar automáticamente"),
    /** The person sent the wine without a label photo, so only a moderator can check it. */
    LABEL_PHOTO_MISSING("No label photo was attached"),
    /** Any other automatic text, such as a moderation provider's own explanation, which is never shown to users. */
    CONTENT_REVIEW(null);

    private final String storedText;

    WineSubmissionSystemReason(String storedText) {
        this.storedText = storedText;
    }

    /** The text persisted as the submission's review reason. */
    public String storedText() {
        return Objects.requireNonNull(storedText, "Content review reasons keep the provider's text");
    }

    static WineSubmissionSystemReason fromStoredText(String text) {
        return Arrays.stream(values())
                .filter(reason -> Objects.nonNull(reason.storedText) && reason.storedText.equals(text))
                .findFirst()
                .orElse(CONTENT_REVIEW);
    }
}
