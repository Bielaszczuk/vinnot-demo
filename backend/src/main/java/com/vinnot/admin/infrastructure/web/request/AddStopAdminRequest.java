package com.vinnot.admin.infrastructure.web.request;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record AddStopAdminRequest(
        @NotBlank @Size(max = 255) String name,
        @Size(max = 20000) String description,
        @Size(max = 100) String type,
        @Size(max = 500) String address,
        @DecimalMin("-90.0") @DecimalMax("90.0") BigDecimal latitude,
        @DecimalMin("-180.0") @DecimalMax("180.0") BigDecimal longitude,
        @PositiveOrZero int stopOrder,
        @Positive Integer estimatedDuration
) {
}
