package com.vinnot.event.infrastructure.persistence.entity;

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

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "event_registrations")
public class EventRegistrationJpaEntity {

    @Id
    private UUID id;

    @Column(name = "event_id", nullable = false)
    private UUID eventId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "attendee_count", nullable = false)
    private int attendeeCount;

    @Column(name = "contact_name")
    private String contactName;

    @Column(name = "contact_email")
    private String contactEmail;

    @Column(name = "contact_phone")
    private String contactPhone;

    private String note;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "companion_names", nullable = false, columnDefinition = "jsonb")
    private List<String> companionNames = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RegistrationStatusEnum status;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false)
    private PaymentStatusEnum paymentStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method")
    private PaymentMethodEnum paymentMethod;

    @Column(name = "externally_managed_payment", nullable = false)
    private boolean externallyManagedPayment;

    @Column(name = "total_amount")
    private BigDecimal totalAmount;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(name = "organizer_note")
    private String organizerNote;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "confirmed_at")
    private Instant confirmedAt;

    @Column(name = "rejected_at")
    private Instant rejectedAt;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /** Who made the latest change. The domain never carries it, so every save writes its own actor or NULL. */
    @Column(name = "last_actor_id")
    private UUID lastActorId;

    public enum RegistrationStatusEnum {
        REQUESTED,
        AWAITING_PAYMENT,
        AWAITING_ATTENDEE_CONFIRMATION,
        CONFIRMED,
        WAITLISTED,
        REJECTED,
        CANCELLED,
        EXPIRED
    }

    public enum PaymentStatusEnum {
        NOT_REQUIRED,
        PENDING,
        REPORTED,
        APPROVED,
        REJECTED,
        PAY_AT_VENUE,
        REFUNDED
    }

    public enum PaymentMethodEnum {
        FREE,
        TRANSFER,
        QR,
        CASH,
        MERCADO_PAGO
    }
}
