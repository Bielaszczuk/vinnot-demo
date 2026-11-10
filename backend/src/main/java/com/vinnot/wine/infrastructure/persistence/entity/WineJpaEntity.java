package com.vinnot.wine.infrastructure.persistence.entity;

import com.vinnot.region.infrastructure.persistence.entity.CountryJpaEntity;
import com.vinnot.region.infrastructure.persistence.entity.RegionJpaEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import jakarta.persistence.Version;

@Entity
@Table(name = "wines")
@Getter
@Setter
@NoArgsConstructor
public class WineJpaEntity {

    @Id
    private UUID id;

    @Version
    private long revision;

    @Column(name = "winery_id")
    private UUID wineryId;

    @Column(nullable = false)
    private String name;

    private Integer vintage;

    @Column(name = "wine_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private WineTypeEnum wineType;

    private String style;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<String> grapes;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<String> allergens;

    @Column(name = "description_es")
    private String descriptionEs;

    @Column(name = "description_en")
    private String descriptionEn;

    @Column(name = "alcohol_content")
    private BigDecimal alcoholContent;

    @Column(name = "serving_temp_min")
    private Integer servingTempMin;

    @Column(name = "serving_temp_max")
    private Integer servingTempMax;

    @Column(name = "price_min")
    private BigDecimal priceMin;

    @Column(name = "price_max")
    private BigDecimal priceMax;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "rating_average", nullable = false, updatable = false)
    private BigDecimal ratingAverage = BigDecimal.ZERO;

    @Column(name = "rating_count", nullable = false, updatable = false)
    private int ratingCount = 0;

    @Column(name = "is_featured", nullable = false)
    private boolean featured = false;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "region_id")
    private RegionJpaEntity regionEntity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "country_id")
    private CountryJpaEntity countryEntity;

    @Column(name = "is_natural")
    private Boolean natural = false;

    @Column(name = "labels_count")
    private Integer labelsCount;

    @Column(name = "vintages_count")
    private Integer vintagesCount;

    @Column(name = "best_vintage_year")
    private Integer bestVintageYear;

    @Column(name = "best_vintage_rating")
    private BigDecimal bestVintageRating;

    @Column(name = "bottle_image_url")
    private String bottleImageUrl;

    @Column(name = "external_url")
    private String externalUrl;

    @Column(name = "food_pairing")
    private String foodPairing;

    @Column(name = "seo_name")
    private String seoName;

    @Column(name = "acidity_score")
    private Integer acidityScore;

    @Column(name = "tannin_score")
    private Integer tanninScore;

    @Column(name = "body_score")
    private Integer bodyScore;

    @Column(name = "sweetness_score")
    private Integer sweetnessScore;

    /** Wine type enum for JPA persistence. */
    public enum WineTypeEnum {
        RED, WHITE, ROSE, SPARKLING, DESSERT, FORTIFIED, ORANGE
    }
}
