package com.vinnot.wineroute.infrastructure.web.request;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.util.List;
/**
 * Request DTO for creating a wine route.
 */
public record CreateWineRouteRequest(
        @NotBlank @Size(max = 255) String name,
        @Size(max = 20000) String description,
        @Size(max = 100) String country,
        @Size(max = 100) String region,
        @Size(max = 100) String subregion,
        @Positive Integer estimatedDuration,
        @Positive Integer estimatedDays,
        @PositiveOrZero Double totalDistance,
        @Size(max = 50) String difficulty,
        @Size(max = 500) String imageUrl,
        @Size(max = 50) List<@Size(max = 50) String> recommendedWineTypes,
        @Size(max = 1000) String mapEmbedUrl
) {
}
