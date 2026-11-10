package com.vinnot.wineroute.infrastructure.persistence.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * JPA Entity for WineRoute persistence.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "wine_routes")
public class WineRouteJpaEntity {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String name;

    private String description;

    private String country;

    private String region;

    private String subregion;

    @Column(name = "estimated_duration_minutes")
    private Integer estimatedDurationMinutes;

    @Column(name = "estimated_days")
    private Integer estimatedDays;

    @Column(name = "total_distance_km")
    private Double totalDistanceKm;

    @Enumerated(EnumType.STRING)
    private DifficultyEnum difficulty;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private StatusEnum status = StatusEnum.DRAFT;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "recommended_wine_types")
    private List<String> recommendedWineTypes;

    @Column(name = "map_embed_url")
    private String mapEmbedUrl;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @OneToMany(mappedBy = "wineRouteId", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("stopOrder ASC")
    private List<RouteStopJpaEntity> stops = new ArrayList<>();

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public enum StatusEnum {
        DRAFT, PUBLISHED, ARCHIVED
    }

    public enum DifficultyEnum {
        SHORT, MEDIUM, LONG
    }
}
