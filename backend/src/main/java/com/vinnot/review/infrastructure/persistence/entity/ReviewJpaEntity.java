package com.vinnot.review.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;
import com.vinnot.review.domain.model.PublicationStatus;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "reviews")
public class ReviewJpaEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "publication_status", nullable = false)
    private PublicationStatus publicationStatus = PublicationStatus.PENDING;

    @Id
    private UUID id;

    @Column(name = "wine_id", nullable = false)
    private UUID wineId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private BigDecimal rating;

    private String title;

    private String comment;

    private Integer vintage;

    @Column(name = "is_verified", nullable = false)
    private boolean verified = false;

    @Column(name = "helpful_count", nullable = false)
    private int helpfulCount = 0;

    @Column(name = "likes_count", nullable = false)
    private int likesCount = 0;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
