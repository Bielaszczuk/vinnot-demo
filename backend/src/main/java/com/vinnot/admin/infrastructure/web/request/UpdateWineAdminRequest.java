package com.vinnot.admin.infrastructure.web.request;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.Set;

public record UpdateWineAdminRequest(
        @Size(max = 255) String name,
        UUID wineryId,
        @Size(max = 50) String wineType,
        @Min(1800) @Max(2100) Integer vintage,
        @Size(max = 100) String style,
        @Size(max = 50) List<@Size(max = 100) String> grapes,
        @Size(max = 50) List<@Size(max = 100) String> allergens,
        @Size(max = 20000) String descriptionEs,
        @Size(max = 20000) String descriptionEn,
        @DecimalMin("0.0") @DecimalMax("100.0") BigDecimal alcoholContent,
        @Min(0) @Max(25) Integer servingTempMin,
        @Min(0) @Max(25) Integer servingTempMax,
        @PositiveOrZero BigDecimal priceMin,
        @PositiveOrZero BigDecimal priceMax,
        @Size(max = 500) String imageUrl,
        @JsonProperty("isFeatured") Boolean isFeatured,
        @JsonProperty("isActive") Boolean isActive,
        @Min(0) @Max(100) Integer acidityScore,
        @Min(0) @Max(100) Integer tanninScore,
        @Min(0) @Max(100) Integer bodyScore,
        @Min(0) @Max(100) Integer sweetnessScore,
        @Size(max = 50) Set<@Size(max = 64) String> clearFields
) {
}
