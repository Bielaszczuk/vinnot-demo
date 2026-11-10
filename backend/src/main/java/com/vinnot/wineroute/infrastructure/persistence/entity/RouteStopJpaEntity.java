package com.vinnot.wineroute.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * JPA Entity for RouteStop persistence.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "wine_route_stops")
public class RouteStopJpaEntity {

    @Id
    private UUID id;

    @Column(name = "wine_route_id", nullable = false)
    private UUID wineRouteId;

    @Column(nullable = false)
    private String name;

    private String description;

    private String type;

    private String address;

    private BigDecimal latitude;

    private BigDecimal longitude;

    @Column(name = "stop_order", nullable = false)
    private int stopOrder;

    @Column(name = "estimated_duration_minutes")
    private Integer estimatedDurationMinutes;
}
