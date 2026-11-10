package com.vinnot.event.infrastructure.persistence.entity;

import com.vinnot.event.domain.valueobject.EventRegistrationSettings;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "events")
public class EventJpaEntity {

    @Id
    private UUID id;

    @Column(name = "published_once", nullable = false)
    private boolean publishedOnce;

    @Column(name = "schedule_version", nullable = false)
    private long scheduleVersion;

    @Column(nullable = false)
    private String title;

    private String description;

    @Column(name = "event_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private EventTypeEnum eventType;

    @Column(name = "start_date", nullable = false)
    private Instant startDate;

    @Column(name = "end_date", nullable = false)
    private Instant endDate;

    @Column(name = "location_name")
    private String locationName;

    @Column(name = "location_address")
    private String locationAddress;

    @Column(name = "location_city")
    private String locationCity;

    @Column(name = "location_region")
    private String locationRegion;

    @Column(name = "location_country")
    private String locationCountry;

    private BigDecimal latitude;

    private BigDecimal longitude;

    @Column(name = "map_embed_url")
    private String mapEmbedUrl;

    private BigDecimal price;

    @Column(name = "max_attendees")
    private Integer maxAttendees;

    @Column(name = "current_attendees", nullable = false)
    private int currentAttendees = 0;

    @Column(name = "held_attendees", nullable = false)
    private int heldAttendees = 0;

    @Column(nullable = false, length = 3)
    private String currency = "ARS";

    @Column(name = "registration_deadline")
    private Instant registrationDeadline;

    @Column(name = "max_tickets_per_registration", nullable = false)
    private int maxTicketsPerRegistration = EventRegistrationSettings.DEFAULT_MAX_TICKETS;

    @Column(name = "approval_mode", nullable = false)
    @Enumerated(EnumType.STRING)
    private ApprovalModeEnum approvalMode = ApprovalModeEnum.MANUAL;

    @Column(name = "attendee_confirmation_required", nullable = false)
    private boolean attendeeConfirmationRequired = true;

    @Column(name = "registration_hold_minutes", nullable = false)
    private int registrationHoldMinutes = EventRegistrationSettings.DEFAULT_HOLD_MINUTES;

    @Column(name = "payment_alias")
    private String paymentAlias;

    @Column(name = "payment_qr_url")
    private String paymentQrUrl;

    @Column(name = "payment_instructions")
    private String paymentInstructions;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private EventStatusEnum status = EventStatusEnum.DRAFT;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "organizer_id", nullable = false)
    private UUID organizerId;

    @Column(name = "organizer_type", nullable = false)
    private String organizerType = "PARTNER";

    @Column(name = "contact_email")
    private String contactEmail;

    @Column(name = "contact_phone")
    private String contactPhone;

    @Column(name = "website_url")
    private String websiteUrl;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public enum EventTypeEnum {
        TASTING, FESTIVAL, TOUR, WORKSHOP, CLASS, DINNER, PAIRING, COMPETITION, FAIR, HARVEST, OTHER
    }

    public enum EventStatusEnum {
        DRAFT, PUBLISHED, CANCELLED, POSTPONED, SOLD_OUT, COMPLETED
    }

    public enum ApprovalModeEnum {
        MANUAL, AUTOMATIC
    }
}
