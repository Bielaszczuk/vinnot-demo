package com.vinnot.wine.infrastructure.web.request;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record CreateWineRequest(
        @NotBlank @Size(max = 255) String name,
        UUID wineryId,
        @NotBlank @Size(max = 50) String wineType,
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
        boolean isFeatured
) {
}
