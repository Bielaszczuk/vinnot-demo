package com.vinnot.event.domain.model;

import com.vinnot.event.domain.valueobject.EventCapacity;
import com.vinnot.event.domain.valueobject.EventDateRange;
import com.vinnot.event.domain.valueobject.EventLocation;
import com.vinnot.event.domain.valueobject.EventRegistrationSettings;
import com.vinnot.event.domain.valueobject.EventStatus;
import com.vinnot.event.domain.valueobject.EventType;
import com.vinnot.shared.domain.base.AggregateRoot;
import com.vinnot.shared.domain.exception.DomainException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public class Event extends AggregateRoot<UUID> {

    private final UUID id;
    private String title;
    private String description;
    private EventType eventType;
    private EventDateRange dateRange;
    private EventLocation location;
    private BigDecimal price;
    private EventCapacity capacity;
    private EventRegistrationSettings registrationSettings;
    private EventStatus status;
    private boolean publishedOnce;
    private long scheduleVersion;
    private String imageUrl;
    private UUID organizerId;
    private String organizerType;
    private String contactEmail;
    private String contactPhone;
    private String websiteUrl;
    private Instant createdAt;
    private Instant updatedAt;

    private Event(Builder builder) {
        this.id = builder.id;
        this.title = builder.title;
        this.description = builder.description;
        this.eventType = builder.eventType;
        this.dateRange = builder.dateRange;
        this.location = builder.location;
        this.price = builder.price;
        this.capacity = builder.capacity;
        this.registrationSettings = builder.registrationSettings;
        this.status = builder.status;
        this.publishedOnce = builder.publishedOnce || builder.status == EventStatus.PUBLISHED || builder.status == EventStatus.SOLD_OUT;
        this.scheduleVersion = builder.scheduleVersion;
        this.imageUrl = builder.imageUrl;
        this.organizerId = builder.organizerId;
        this.organizerType = builder.organizerType;
        this.contactEmail = builder.contactEmail;
        this.contactPhone = builder.contactPhone;
        this.websiteUrl = builder.websiteUrl;
        this.createdAt = builder.createdAt;
        this.updatedAt = builder.updatedAt;
    }

    /**
     * Factory method to create a new Event.
     *
     * @param title       the event title
     * @param eventType   the event type
     * @param dateRange   the date range
     * @param organizerId the organizer user ID
     * @return the created Event
     */
    public static Event create(String title, EventType eventType, EventDateRange dateRange, UUID organizerId) {
        Objects.requireNonNull(title, "Title cannot be null");
        Objects.requireNonNull(eventType, "Event type cannot be null");
        Objects.requireNonNull(dateRange, "Date range cannot be null");
        Objects.requireNonNull(organizerId, "Organizer ID cannot be null");

        if (title.isBlank()) {
            throw new DomainException("INVALID_EVENT_TITLE", "Event title cannot be empty");
        }

        Instant now = Instant.now();
        return builder()
                .id(UUID.randomUUID())
                .title(title.trim())
                .eventType(eventType)
                .dateRange(dateRange)
                .organizerId(organizerId)
                .organizerType("PARTNER")
                .capacity(EventCapacity.unlimited())
                .registrationSettings(EventRegistrationSettings.defaults())
                .status(EventStatus.DRAFT)
                .createdAt(now)
                .updatedAt(now)
                .build();
    }

    /**
     * Creates a builder for Event.
     *
     * @return a new Builder instance
     */
    public static Builder builder() {
        return new Builder();
    }

    @Override
    public UUID getId() {
        return id;
    }

    /**
     * Gets the title.
     *
     * @return the title
     */
    public String getTitle() {
        return title;
    }

    /**
     * Gets the description.
     *
     * @return the description
     */
    public String getDescription() {
        return description;
    }

    /**
     * Gets the event type.
     *
     * @return the event type
     */
    public EventType getEventType() {
        return eventType;
    }

    /**
     * Gets the date range.
     *
     * @return the date range
     */
    public EventDateRange getDateRange() {
        return dateRange;
    }

    /**
     * Gets the location.
     *
     * @return the location
     */
    public EventLocation getLocation() {
        return location;
    }

    /**
     * Gets the price.
     *
     * @return the price (null if free)
     */
    public BigDecimal getPrice() {
        return price;
    }

    /**
     * Gets the capacity.
     *
     * @return the capacity
     */
    public EventCapacity getCapacity() {
        return capacity;
    }

    public EventRegistrationSettings getRegistrationSettings() {
        return registrationSettings;
    }

    /**
     * Gets the status.
     *
     * @return the status
     */
    public EventStatus getStatus() {
        return status;
    }

    /**
     * Gets the image URL.
     *
     * @return the image URL
     */
    public String getImageUrl() {
        return imageUrl;
    }

    /**
     * Gets the organizer ID.
     *
     * @return the organizer user ID
     */
    public UUID getOrganizerId() {
        return organizerId;
    }

    /**
     * Gets the organizer type.
     *
     * @return the organizer type
     */
    public String getOrganizerType() {
        return organizerType;
    }

    /**
     * Gets the contact email.
     *
     * @return the contact email
     */
    public String getContactEmail() {
        return contactEmail;
    }

    /**
     * Gets the contact phone.
     *
     * @return the contact phone
     */
    public String getContactPhone() {
        return contactPhone;
    }

    /**
     * Gets the website URL.
     *
     * @return the website URL
     */
    public String getWebsiteUrl() {
        return websiteUrl;
    }

    @Override
    public Instant getCreatedAt() {
        return createdAt;
    }

    @Override
    public Instant getUpdatedAt() {
        return updatedAt;
    }

    /**
     * Updates the basic information.
     *
     * @param title       the new title
     * @param description the new description
     * @param eventType   the new event type
     */
    public void updateBasicInfo(String title, String description, EventType eventType) {
        if (Objects.nonNull(title) && !title.isBlank()) {
            this.title = title.trim();
        }
        this.description = description;
        if (Objects.nonNull(eventType)) {
            this.eventType = eventType;
        }
        this.updatedAt = Instant.now();
    }

    /**
     * Updates the date range.
     *
     * @param dateRange the new date range
     */
    public void updateDateRange(EventDateRange dateRange) {
        Objects.requireNonNull(dateRange, "Date range cannot be null");
        if (!dateRange.equals(this.dateRange)) {
            this.scheduleVersion++;
        }
        this.dateRange = dateRange;
        this.updatedAt = Instant.now();
    }

    /**
     * Updates the location.
     *
     * @param location the new location
     */
    public void updateLocation(EventLocation location) {
        if (!Objects.equals(venueOf(location), venueOf(this.location))) {
            this.scheduleVersion++;
        }
        this.location = location;
        this.updatedAt = Instant.now();
    }

    /**
     * Counts the changes attendees are told about: start, end, or the venue as people read it (name and address,
     * not map coordinates). It only grows, so it keys change notices.
     *
     * @return the schedule version
     */
    public long getScheduleVersion() {
        return scheduleVersion;
    }

    /**
     * The venue as attendees read it, or {@code null} when none is set.
     *
     * @return the full address, or null
     */
    public String getVenue() {
        return venueOf(location);
    }

    private static String venueOf(EventLocation location) {
        return Objects.isNull(location) ? null : location.getReadableVenue();
    }

    /**
     * Updates the price.
     *
     * @param price the new price (null for free)
     */
    public void updatePrice(BigDecimal price) {
        if (Objects.nonNull(price) && price.compareTo(BigDecimal.ZERO) < 0) {
            throw new DomainException("INVALID_PRICE", "Price cannot be negative");
        }
        this.price = price;
        this.updatedAt = Instant.now();
    }

    /**
     * Updates the capacity.
     *
     * @param maxAttendees the new maximum (null for unlimited)
     */
    public void updateCapacity(Integer maxAttendees) {
        this.capacity = Objects.nonNull(maxAttendees)
                ? EventCapacity.of(
                        maxAttendees,
                        this.capacity.getCurrentAttendees(),
                        this.capacity.getHeldAttendees())
                : EventCapacity.of(
                        null,
                        this.capacity.getCurrentAttendees(),
                        this.capacity.getHeldAttendees());
        this.updatedAt = Instant.now();
    }

    public void updateRegistrationSettings(EventRegistrationSettings settings) {
        this.registrationSettings = Objects.requireNonNull(settings, "Registration settings cannot be null");
        this.updatedAt = Instant.now();
    }

    /**
     * Updates the image URL.
     *
     * @param imageUrl the new image URL
     */
    public void updateImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
        this.updatedAt = Instant.now();
    }

    /**
     * Updates contact information.
     *
     * @param email   the contact email
     * @param phone   the contact phone
     * @param website the website URL
     */
    public void updateContactInfo(String email, String phone, String website) {
        this.contactEmail = email;
        this.contactPhone = phone;
        this.websiteUrl = website;
        this.updatedAt = Instant.now();
    }

    public boolean isPublishedOnce() {
        return publishedOnce;
    }

    public boolean isPubliclyVisible() {
        return publishedOnce && status != EventStatus.DRAFT;
    }

    /**
     * Publishes the event and records its publication history.
     */
    public void publish() {
        if (this.status == EventStatus.CANCELLED) {
            throw new DomainException("CANNOT_PUBLISH", "Cannot publish a cancelled event");
        }
        this.status = EventStatus.PUBLISHED;
        this.publishedOnce = true;
        this.updatedAt = Instant.now();
    }

    /**
     * Cancels the event.
     */
    public void cancel() {
        if (this.status == EventStatus.COMPLETED) {
            throw new DomainException("CANNOT_CANCEL", "Cannot cancel a completed event");
        }
        this.status = EventStatus.CANCELLED;
        this.capacity = EventCapacity.withLimit(capacity.getMaxAttendees());
        this.updatedAt = Instant.now();
    }

    /**
     * Marks the event as completed. A cancelled event is terminal: completing it
     * would otherwise reopen the path back to PUBLISHED.
     */
    public void complete() {
        if (this.status == EventStatus.CANCELLED) {
            throw new DomainException("CANNOT_COMPLETE", "Cannot complete a cancelled event");
        }
        this.status = EventStatus.COMPLETED;
        this.updatedAt = Instant.now();
    }

    /**
     * Applies a status requested by an event-management use case.
     *
     * @param requestedStatus the target status
     */
    public void transitionTo(EventStatus requestedStatus) {
        Objects.requireNonNull(requestedStatus, "Requested status cannot be null");

        switch (requestedStatus) {
            case DRAFT -> moveToDraft();
            case PUBLISHED -> publish();
            case CANCELLED -> cancel();
            case POSTPONED -> postpone();
            case COMPLETED -> complete();
            case SOLD_OUT -> throw new DomainException(
                    "INVALID_EVENT_STATUS",
                    "Sold out status is managed automatically from event capacity");
            default -> throw new DomainException(
                    "INVALID_EVENT_STATUS",
                    "Unsupported event status");
        }
    }

    private void moveToDraft() {
        if (this.status == EventStatus.CANCELLED) {
            throw new DomainException("CANNOT_DRAFT", "Cannot move a cancelled event back to draft");
        }
        this.status = EventStatus.DRAFT;
        this.updatedAt = Instant.now();
    }

    private void postpone() {
        if (this.status == EventStatus.CANCELLED || this.status == EventStatus.COMPLETED) {
            throw new DomainException("CANNOT_POSTPONE", "Cannot postpone a cancelled or completed event");
        }
        this.status = EventStatus.POSTPONED;
        this.updatedAt = Instant.now();
    }

    /**
     * Registers a user for the event.
     */
    public void registerAttendee() {
        confirmAttendees(1);
    }

    public void unregisterAttendee() {
        releaseConfirmedAttendees(1);
    }

    public void holdAttendees(int attendeeCount) {
        ensureRegistrationOpen(attendeeCount);
        capacity = capacity.hold(attendeeCount);
        updateAvailabilityStatus();
    }

    public void releaseHeldAttendees(int attendeeCount) {
        capacity = capacity.releaseHold(attendeeCount);
        updateAvailabilityStatus();
    }

    public void confirmHeldAttendees(int attendeeCount) {
        if (status != EventStatus.PUBLISHED && status != EventStatus.SOLD_OUT) {
            throw new DomainException("NOT_AVAILABLE", "Event is not available for confirmation");
        }
        capacity = capacity.confirmHold(attendeeCount);
        updateAvailabilityStatus();
    }

    public void confirmAttendees(int attendeeCount) {
        ensureRegistrationOpen(attendeeCount);
        capacity = capacity.confirm(attendeeCount);
        updateAvailabilityStatus();
    }

    public void releaseConfirmedAttendees(int attendeeCount) {
        capacity = capacity.releaseConfirmed(attendeeCount);
        updateAvailabilityStatus();
    }

    public void ensureRegistrationOpen(int attendeeCount) {
        ensureRegistrationRequestAllowed(attendeeCount);
        if (!hasAvailableCapacity(attendeeCount)) {
            throw new DomainException("EVENT_SOLD_OUT", "There are not enough available spots");
        }
    }

    public void ensureRegistrationRequestAllowed(int attendeeCount) {
        if (status != EventStatus.PUBLISHED && status != EventStatus.SOLD_OUT) {
            throw new DomainException("NOT_AVAILABLE", "Event is not available for registration");
        }
        if (!registrationSettings.acceptsRegistrationsAt(Instant.now(), dateRange.getStartDate())) {
            throw new DomainException("REGISTRATION_CLOSED", "Event registration is closed");
        }
        if (attendeeCount > registrationSettings.getMaxTicketsPerRegistration()) {
            throw new DomainException(
                    "REGISTRATION_LIMIT_EXCEEDED",
                    "Requested attendees exceed the per-registration limit");
        }
    }

    public boolean hasAvailableCapacity(int attendeeCount) {
        Integer available = capacity.getAvailableSpots();
        return Objects.isNull(available) || attendeeCount <= available;
    }

    private void updateAvailabilityStatus() {
        if (status == EventStatus.PUBLISHED && capacity.isSoldOut()) {
            status = EventStatus.SOLD_OUT;
        } else if (status == EventStatus.SOLD_OUT && !capacity.isSoldOut()) {
            status = EventStatus.PUBLISHED;
        }
        updatedAt = Instant.now();
    }

    /**
     * Checks if the event is available for registration.
     *
     * @return true if available
     */
    public boolean isAvailable() {
        return this.status == EventStatus.PUBLISHED
                && this.capacity.hasAvailableSpots()
                && this.registrationSettings.acceptsRegistrationsAt(
                        Instant.now(),
                        this.dateRange.getStartDate());
    }

    public static class Builder {
        private UUID id;
        private String title;
        private String description;
        private EventType eventType;
        private EventDateRange dateRange;
        private EventLocation location;
        private BigDecimal price;
        private EventCapacity capacity = EventCapacity.unlimited();
        private EventRegistrationSettings registrationSettings = EventRegistrationSettings.defaults();
        private EventStatus status = EventStatus.DRAFT;
        private boolean publishedOnce;
        private long scheduleVersion;
        private String imageUrl;
        private UUID organizerId;
        private String organizerType = "PARTNER";
        private String contactEmail;
        private String contactPhone;
        private String websiteUrl;
        private Instant createdAt;
        private Instant updatedAt;

        public Builder id(UUID id) {
            this.id = id;
            return this;
        }

        public Builder title(String title) {
            this.title = title;
            return this;
        }

        public Builder description(String description) {
            this.description = description;
            return this;
        }

        public Builder eventType(EventType eventType) {
            this.eventType = eventType;
            return this;
        }

        public Builder dateRange(EventDateRange dateRange) {
            this.dateRange = dateRange;
            return this;
        }

        public Builder location(EventLocation location) {
            this.location = location;
            return this;
        }

        public Builder price(BigDecimal price) {
            this.price = price;
            return this;
        }

        public Builder capacity(EventCapacity capacity) {
            this.capacity = capacity;
            return this;
        }

        public Builder registrationSettings(EventRegistrationSettings settings) {
            this.registrationSettings = settings;
            return this;
        }

        public Builder status(EventStatus status) {
            this.status = status;
            return this;
        }

        public Builder publishedOnce(boolean value) {
            this.publishedOnce = value;
            return this;
        }

        public Builder scheduleVersion(long value) {
            this.scheduleVersion = value;
            return this;
        }

        public Builder imageUrl(String imageUrl) {
            this.imageUrl = imageUrl;
            return this;
        }

        public Builder organizerId(UUID organizerId) {
            this.organizerId = organizerId;
            return this;
        }

        public Builder organizerType(String organizerType) {
            this.organizerType = organizerType;
            return this;
        }

        public Builder contactEmail(String contactEmail) {
            this.contactEmail = contactEmail;
            return this;
        }

        public Builder contactPhone(String contactPhone) {
            this.contactPhone = contactPhone;
            return this;
        }

        public Builder websiteUrl(String websiteUrl) {
            this.websiteUrl = websiteUrl;
            return this;
        }

        public Builder createdAt(Instant createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        public Builder updatedAt(Instant updatedAt) {
            this.updatedAt = updatedAt;
            return this;
        }

        public Event build() {
            Objects.requireNonNull(id, "Event id cannot be null");
            Objects.requireNonNull(title, "Event title cannot be null");
            Objects.requireNonNull(eventType, "Event type cannot be null");
            Objects.requireNonNull(dateRange, "Date range cannot be null");
            Objects.requireNonNull(organizerId, "Organizer ID cannot be null");
            Objects.requireNonNull(registrationSettings, "Registration settings cannot be null");
            return new Event(this);
        }
    }
}
