package com.vinnot.admin.infrastructure.web.request;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.UUID;
import java.util.Set;

public record UpdateWineryAdminRequest(
        @Size(max = 255) String name,
        @Size(max = 20000) String descriptionEs,
        @Size(max = 20000) String descriptionEn,
        UUID countryId,
        UUID regionId,
        @Size(max = 100) String subregion,
        @Size(max = 500) String address,
        @DecimalMin("-90.0") @DecimalMax("90.0") BigDecimal latitude,
        @DecimalMin("-180.0") @DecimalMax("180.0") BigDecimal longitude,
        @Email @Size(max = 255) String email,
        @Size(max = 50) String phone,
        @Size(max = 500) String website,
        @Size(max = 500) String logoUrl,
        @Size(max = 500) String imageUrl,
        @Min(1000) @Max(2100) Integer establishedYear,
        @Size(max = 50) Set<@Size(max = 64) String> clearFields
) {
}
