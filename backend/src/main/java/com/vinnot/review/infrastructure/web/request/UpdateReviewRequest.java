package com.vinnot.review.infrastructure.web.request;
import com.vinnot.shared.infrastructure.web.validation.OneDecimalRating;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record UpdateReviewRequest(
        @OneDecimalRating BigDecimal rating,
        @Size(max = 255) String title,
        String comment,
        @Min(1800) @Max(2100) Integer vintage,
        Boolean clearVintage
) {
}
