package com.vinnot.wine.infrastructure.persistence.entity;

import com.vinnot.wine.domain.model.WineSubmissionStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "wine_submissions")
@Getter
@Setter
@NoArgsConstructor
public class WineSubmissionJpaEntity {

    @Id
    private UUID id;

    @Column(name = "submitted_by", nullable = false)
    private UUID submittedBy;

    @Column(name = "wine_name", nullable = false)
    private String wineName;

    @Column(name = "winery_name", nullable = false)
    private String wineryName;

    @Column(name = "wine_type")
    private String wineType;

    private Integer vintage;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private List<String> grapes;

    private String country;
    private String region;

    @Column(name = "winery_id")
    private UUID wineryId;

    @Column(name = "country_id")
    private UUID countryId;

    @Column(name = "region_id")
    private UUID regionId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "proposed_grapes", nullable = false)
    private List<String> proposedGrapes = new ArrayList<>();

    @Column(name = "alcohol_content")
    private BigDecimal alcoholContent;

    private String notes;

    @Column(name = "image_url")
    private String imageUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WineSubmissionStatus status;

    @Column(name = "review_reason")
    private String reviewReason;

    @Column(name = "review_confidence", precision = 5, scale = 4)
    private BigDecimal reviewConfidence;

    @Column(name = "matched_wine_id")
    private UUID matchedWineId;

    @Column(name = "created_wine_id")
    private UUID createdWineId;

    @Column(name = "reviewed_by")
    private UUID reviewedBy;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "image_quarantined", nullable = false)
    private boolean imageQuarantined;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
