package com.vinnot.cellar.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "cellar_wines")
public class CellarWineJpaEntity {
    private static final int MIN_WHOLE_RATING = 1;
    private static final int MAX_WHOLE_RATING = 5;

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "wine_id", nullable = false)
    private UUID wineId;

    /** The personal rating, 0.1 to 5.0 with one decimal (V71). */
    @Column(name = "rating_decimal", precision = 2, scale = 1)
    private BigDecimal rating;

    /**
     * The whole rating (1 to 5) the previous backend revision still reads; written alongside {@link #rating} until a
     * later migration drops the column. Never read by this revision.
     */
    @Setter(AccessLevel.NONE)
    @Column(name = "rating")
    private Integer wholeRating;

    @Column(name = "purchase_price")
    private BigDecimal purchasePrice;

    private String notes;

    private Integer vintage;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /** Sets the rating and the whole one derived from it: rounded half up, kept between 1 and 5, null when null. */
    public void setRating(BigDecimal rating) {
        this.rating = rating;
        this.wholeRating = Objects.isNull(rating)
                ? null
                : Math.clamp(rating.setScale(0, RoundingMode.HALF_UP).intValue(), MIN_WHOLE_RATING, MAX_WHOLE_RATING);
    }
}
