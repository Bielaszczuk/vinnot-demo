package com.vinnot.wine.application.command.model;

import com.vinnot.shared.application.command.Command;
import com.vinnot.wine.application.query.response.WineSubmissionResponse;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

public record SubmitWineCommand(
        UUID submittedBy,
        String wineName,
        String wineryName,
        String wineType,
        Integer vintage,
        List<String> grapes,
        String country,
        String region,
        BigDecimal alcoholContent,
        String notes,
        byte[] imageBytes,
        String imageContentType,
        String originalFilename,
        UUID wineryId,
        UUID countryId,
        UUID regionId
) implements Command<WineSubmissionResponse> {

    /** Whether the person attached a label photo; without one the wine always goes to manual review. */
    public boolean hasLabelPhoto() {
        return Objects.nonNull(imageBytes) && imageBytes.length > 0;
    }

    /** A submission without catalog picks, as older app versions send it. */
    public SubmitWineCommand(
            UUID submittedBy, String wineName, String wineryName, String wineType, Integer vintage,
            List<String> grapes, String country, String region, BigDecimal alcoholContent, String notes,
            byte[] imageBytes, String imageContentType, String originalFilename) {
        this(submittedBy, wineName, wineryName, wineType, vintage, grapes, country, region, alcoholContent,
                notes, imageBytes, imageContentType, originalFilename, null, null, null);
    }
}
