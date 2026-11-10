package com.vinnot.ai.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(
        name = "wine_comparisons",
        uniqueConstraints = @UniqueConstraint(columnNames = {"wine_a_id", "wine_b_id", "language"})
)
public class WineComparisonJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "wine_a_id", nullable = false)
    private UUID wineAId;

    @Column(name = "wine_b_id", nullable = false)
    private UUID wineBId;

    @Column(name = "language", nullable = false, length = 10)
    private String language;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "comparison_json", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> comparisonJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
