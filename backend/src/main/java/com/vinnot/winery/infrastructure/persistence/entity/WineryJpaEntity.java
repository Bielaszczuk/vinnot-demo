package com.vinnot.winery.infrastructure.persistence.entity;

import com.vinnot.region.infrastructure.persistence.entity.CountryJpaEntity;
import com.vinnot.region.infrastructure.persistence.entity.RegionJpaEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * JPA Entity for Winery persistence.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "wineries")
public class WineryJpaEntity {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true)
    private String slug;

    @Column(name = "description_es")
    private String descriptionEs;

    @Column(name = "description_en")
    private String descriptionEn;


    private String subregion;

    private String address;

    private BigDecimal latitude;

    private BigDecimal longitude;

    private String phone;

    private String email;

    private String website;

    @Column(name = "logo_url")
    private String logoUrl;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "established_year")
    private Integer establishedYear;

    @Column(name = "seo_name")
    private String seoName;

    @Column(name = "business_name")
    private String businessName;

    @Column(name = "winery_status")
    private Integer wineryStatus;

    @Column(name = "is_claimed")
    private Boolean claimed;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "region_id")
    private RegionJpaEntity regionEntity;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "country_id")
    private CountryJpaEntity countryEntity;

    @Column(name = "ratings_count")
    private Integer ratingsCount;

    @Column(name = "ratings_average")
    private BigDecimal ratingsAverage;

    @Column(name = "wines_count")
    private Integer winesCount;

    @Column(name = "labels_count")
    private Integer labelsCount;

    @Column(name = "background_image_url")
    private String backgroundImageUrl;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
