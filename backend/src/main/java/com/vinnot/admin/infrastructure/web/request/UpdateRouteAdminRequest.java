package com.vinnot.admin.infrastructure.web.request;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import java.util.Set;

public record UpdateRouteAdminRequest(
        @Size(max = 255) String name,
        @Size(max = 20000) String description,
        @Size(max = 100) String country,
        @Size(max = 100) String region,
        @Size(max = 100) String subregion,
        @Positive Integer estimatedDuration,
        @Positive Integer estimatedDays,
        @PositiveOrZero Double totalDistance,
        @Size(max = 50) String difficulty,
        @Size(max = 500) String imageUrl,
        @Size(max = 1000) String mapEmbedUrl,
        @Size(max = 50) String status,
        @Size(max = 50) List<@Size(max = 50) String> recommendedWineTypes,
        @Valid @Size(max = 100) List<AddStopAdminRequest> stops,
        @Size(max = 100) List<UUID> wineryIds,
        @Size(max = 50) Set<@Size(max = 64) String> clearFields
) {
}
