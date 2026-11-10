package com.vinnot.cellar.infrastructure.web.request;
import com.vinnot.shared.infrastructure.web.validation.OneDecimalRating;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;

public record UpdateCellarEntryRequest(
        @OneDecimalRating BigDecimal rating,
        @PositiveOrZero BigDecimal purchasePrice,
        @Size(max = 10000) String notes,
        @Min(1800) @Max(2100) Integer vintage,
        Boolean clearVintage
) {
}
