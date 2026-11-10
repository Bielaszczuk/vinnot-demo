package com.vinnot.user.domain.model;

import com.vinnot.shared.domain.base.AggregateRoot;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.Password;
import com.vinnot.user.domain.valueobject.PreferredLanguage;
import com.vinnot.user.domain.valueobject.Role;
import com.vinnot.user.domain.valueobject.UserTimezone;
import com.vinnot.user.domain.valueobject.Username;

import java.time.Instant;
import java.util.Collections;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

public class User extends AggregateRoot<UUID> {

    private static final int GENERATED_USERNAME_SUFFIX_LENGTH = 8;

    private final UUID id;
    private final long revision;
    private long sessionVersion;
    private String username;
    private Email email;
    private Password password;
    private boolean passwordSet;
    private String firstName;
    private String lastName;
    private String phoneNumber;
    private String profileImageUrl;
    private Set<Role> roles;
    private boolean active;
    private boolean locked;
    private boolean emailVerified;
    private boolean onboardingCompleted;
    private PreferredLanguage preferredLanguage;
    private UserTimezone timezone;
    private String lockReason;
    private Instant lastLoginAt;
    private Instant createdAt;
    private Instant updatedAt;
    /** Consecutive wrong passwords since the last right one or the last temporary lock (#482). */
    private final int failedLoginAttempts;
    /** End of the temporary sign-in lock, separate from the administrative {@link #isLocked()} (#482). */
    private final Instant loginLockedUntil;

    private User(Builder builder) {
        this.id = builder.id;
        this.revision = builder.revision;
        this.sessionVersion = builder.sessionVersion;
        this.username = builder.username;
        this.email = builder.email;
        this.password = builder.password;
        this.passwordSet = builder.passwordSet;
        this.firstName = builder.firstName;
        this.lastName = builder.lastName;
        this.phoneNumber = builder.phoneNumber;
        this.profileImageUrl = builder.profileImageUrl;
        this.roles = new HashSet<>(builder.roles);
        this.active = builder.active;
        this.locked = builder.locked;
        this.emailVerified = builder.emailVerified;
        this.onboardingCompleted = builder.onboardingCompleted;
        this.preferredLanguage = builder.preferredLanguage;
        this.timezone = builder.timezone;
        this.lockReason = builder.lockReason;
        this.lastLoginAt = builder.lastLoginAt;
        this.createdAt = builder.createdAt;
        this.updatedAt = builder.updatedAt;
        this.failedLoginAttempts = builder.failedLoginAttempts;
        this.loginLockedUntil = builder.loginLockedUntil;
    }

    /**
     * Creates a new user with the given details.
     *
     * @param username  the desired username
     * @param email     the user email
     * @param password  the hashed password
     * @param firstName the first name
     * @param lastName  the last name
     * @return the created User
     */
    public static User create(String username, Email email, Password password,
                               String firstName, String lastName) {
        Instant now = Instant.now();
        return builder()
                .id(UUID.randomUUID())
                .username(Username.of(username).getValue())
                .email(email)
                .password(password)
                .firstName(firstName)
                .lastName(lastName)
                .roles(Set.of(Role.USER))
                .active(true)
                .onboardingCompleted(true)
                .createdAt(now)
                .updatedAt(now)
                .build();
    }

    /**
     * Creates a new user without a username (backwards compatible).
     *
     * @param email     the user email
     * @param password  the hashed password
     * @param firstName the first name
     * @param lastName  the last name
     * @return the created User
     */
    public static User create(Email email, Password password, String firstName, String lastName) {
        return create(
                "vinnoter-" + UUID.randomUUID().toString()
                        .substring(0, GENERATED_USERNAME_SUFFIX_LENGTH),
                email,
                password,
                firstName,
                lastName);
    }

    public static User createSocial(String username, Email email, Password password,
                                    String firstName, String lastName) {
        User user = create(username, email, password, firstName, lastName);
        user.onboardingCompleted = false;
        user.passwordSet = false;
        return user;
    }

    /**
     * Creates a builder for User.
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

    public long getRevision() { return revision; }

    public long getSessionVersion() { return sessionVersion; }

    /**
     * Gets the username.
     *
     * @return the username
     */
    public String getUsername() {
        return username;
    }

    /**
     * Gets the user email.
     *
     * @return the email
     */
    public Email getEmail() {
        return email;
    }

    /**
     * Gets the password.
     *
     * @return the password
     */
    public Password getPassword() {
        return password;
    }

    /**
     * Whether the account has a password its owner chose (registration, change or reset). Accounts created by a
     * social sign-in, or whose unproven password was revoked when a provider proved the email, have an unusable
     * random password instead and can only set one through the reset link.
     *
     * @return true when the owner can sign in, and change the password, with a password they know
     */
    public boolean hasPassword() {
        return passwordSet;
    }

    /**
     * Gets the first name.
     *
     * @return the first name
     */
    public String getFirstName() {
        return firstName;
    }

    /**
     * Gets the last name.
     *
     * @return the last name
     */
    public String getLastName() {
        return lastName;
    }

    /**
     * Gets the full name.
     *
     * @return first name and last name combined
     */
    public String getFullName() {
        return String.format("%s %s", firstName, lastName).trim();
    }

    /**
     * Gets the profile image URL.
     *
     * @return the profile image URL
     */
    public String getProfileImageUrl() {
        return profileImageUrl;
    }

    /**
     * Gets the user roles.
     *
     * @return unmodifiable set of roles
     */
    public Set<Role> getRoles() {
        return Collections.unmodifiableSet(roles);
    }

    /**
     * Checks if user is active.
     *
     * @return true if active
     */
    public boolean isActive() {
        return active;
    }

    /**
     * Checks if user is locked.
     *
     * @return true if locked
     */
    public boolean isLocked() {
        return locked;
    }

    /**
     * Checks if email is verified.
     *
     * @return true if email verified
     */
    public boolean isEmailVerified() {
        return emailVerified;
    }

    public boolean isOnboardingCompleted() {
        return onboardingCompleted;
    }

    public PreferredLanguage getPreferredLanguage() {
        return preferredLanguage;
    }

    public UserTimezone getTimezone() {
        return timezone;
    }

    /**
     * Gets the lock reason.
     *
     * @return the lock reason
     */
    public String getLockReason() {
        return lockReason;
    }

    /**
     * Gets the last login timestamp.
     *
     * @return the last login at
     */
    public Instant getLastLoginAt() {
        return lastLoginAt;
    }

    /** Consecutive wrong passwords as loaded; the persistence port changes it atomically, not this aggregate. */
    public int getFailedLoginAttempts() {
        return failedLoginAttempts;
    }

    /** End of the temporary sign-in lock as loaded, or null when none was ever set. */
    public Instant getLoginLockedUntil() {
        return loginLockedUntil;
    }

    /** True while the temporary sign-in lock is still running at {@code now}. */
    public boolean isLoginLockedAt(Instant now) {
        return Objects.nonNull(loginLockedUntil) && loginLockedUntil.isAfter(now);
    }

    /** True when a successful password check has something to clear. */
    public boolean hasLoginFailures() {
        return failedLoginAttempts > 0 || Objects.nonNull(loginLockedUntil);
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
     * Updates the user password.
     *
     * @param newPassword the new hashed password
     */
    public void changePassword(Password newPassword) {
        this.password = Objects.requireNonNull(newPassword, "Password cannot be null");
        this.passwordSet = true;
        this.sessionVersion++;
        this.updatedAt = Instant.now();
    }

    /**
     * Replaces a password the owner may not have chosen with an unusable one and ends every session.
     *
     * @param unusablePassword the hash of a random secret nobody knows
     */
    public void revokePassword(Password unusablePassword) {
        changePassword(unusablePassword);
        this.passwordSet = false;
    }

    /**
     * Marks the email address as verified.
     */
    public void verifyEmail() {
        this.emailVerified = true;
        this.updatedAt = Instant.now();
    }

    /**
     * Replaces the account email after ownership of the new address was verified.
     *
     * @param verifiedEmail the verified replacement email
     */
    public void changeVerifiedEmail(Email verifiedEmail) {
        this.email = Objects.requireNonNull(verifiedEmail, "Email cannot be null");
        this.sessionVersion++;
        this.emailVerified = true;
        this.updatedAt = Instant.now();
    }

    /**
     * Completes empty profile fields with data from a trusted identity provider.
     *
     * @param providerFirstName first name supplied by the provider
     * @param providerLastName  last name supplied by the provider
     * @param providerImageUrl  profile image supplied by the provider
     */
    public void enrichFromIdentityProvider(
            String providerFirstName, String providerLastName, String providerImageUrl) {
        if ((Objects.isNull(firstName) || firstName.isBlank())
                && Objects.nonNull(providerFirstName) && !providerFirstName.isBlank()) {
            this.firstName = providerFirstName;
        }
        if ((Objects.isNull(lastName) || lastName.isBlank())
                && Objects.nonNull(providerLastName) && !providerLastName.isBlank()) {
            this.lastName = providerLastName;
        }
        if ((Objects.isNull(profileImageUrl) || profileImageUrl.isBlank())
                && Objects.nonNull(providerImageUrl) && !providerImageUrl.isBlank()) {
            this.profileImageUrl = providerImageUrl;
        }
        this.updatedAt = Instant.now();
    }

    /** Private contact number; never part of a public profile. */
    public String getPhoneNumber() { return phoneNumber; }

    /** Receives a normalized international number; null explicitly clears it. */
    public void updatePhoneNumber(String value) {
        if (Objects.nonNull(value) && !value.matches("\\+[1-9][0-9]{6,14}")) {
            throw new DomainException(
                    "INVALID_PHONE_NUMBER", "Phone number must use international format");
        }
        this.phoneNumber = value;
        this.updatedAt = Instant.now();
    }

    /** Updates the separately stored display names. */
    public void updateProfile(String firstName, String lastName) {
        this.firstName = Objects.requireNonNull(firstName, "First name cannot be null");
        this.lastName = Objects.requireNonNull(lastName, "Last name cannot be null");
        this.updatedAt = Instant.now();
    }

    /**
     * Assigns an avatar URL produced by the configured storage adapter.
     *
     * @param profileImageUrl the managed avatar URL
     */
    public void updateProfileImage(String profileImageUrl) {
        this.profileImageUrl = profileImageUrl;
        this.updatedAt = Instant.now();
    }

    public void updateUsername(String username) {
        this.username = Username.of(username).getValue();
        this.updatedAt = Instant.now();
    }

    /**
     * Replaces the provided preferences; a null argument keeps the stored value.
     *
     * @param language the new language, or null to keep the current one
     * @param zone     the new time zone, or null to keep the current one
     * @return true when at least one preference changed
     */
    public boolean updatePreferences(PreferredLanguage language, UserTimezone zone) {
        boolean languageChanged = Objects.nonNull(language) && !language.equals(preferredLanguage);
        boolean zoneChanged = Objects.nonNull(zone) && !zone.equals(timezone);
        if (languageChanged) {
            this.preferredLanguage = language;
        }
        if (zoneChanged) {
            this.timezone = zone;
        }
        if (languageChanged || zoneChanged) {
            this.updatedAt = Instant.now();
        }
        return languageChanged || zoneChanged;
    }

    public void completeOnboarding() {
        this.onboardingCompleted = true;
        this.updatedAt = Instant.now();
    }

    /**
     * Adds a role to the user.
     *
     * @param role the role to add
     */
    public void replaceRole(Role role) {
        Objects.requireNonNull(role, "Role cannot be null");
        this.sessionVersion++;
        this.roles.clear();
        this.roles.add(Role.USER);
        this.roles.add(role);
        this.updatedAt = Instant.now();
    }

    public void addRole(Role role) {
        Objects.requireNonNull(role, "Role cannot be null");
        if (this.roles.add(role)) { this.sessionVersion++; }
        this.updatedAt = Instant.now();
    }

    /**
     * Removes a role from the user.
     *
     * @param role the role to remove
     */
    public void removeRole(Role role) {
        if (this.roles.size() <= 1) {
            throw new DomainException("ROLE_REMOVAL_DENIED", "User must have at least one role");
        }
        if (this.roles.remove(role)) { this.sessionVersion++; }
        this.updatedAt = Instant.now();
    }

    /**
     * Checks if user has a specific role.
     *
     * @param role the role to check
     * @return true if user has the role
     */
    public boolean hasRole(Role role) {
        return roles.contains(role);
    }

    /**
     * Deactivates the user account.
     */
    public void deactivate() {
        this.sessionVersion++;
        this.active = false;
        this.updatedAt = Instant.now();
    }

    /**
     * Activates the user account.
     */
    public void activate() {
        this.active = true;
        this.updatedAt = Instant.now();
    }

    /**
     * Locks the user account.
     *
     * @param reason the reason for locking
     */
    public void lock(String reason) {
        this.sessionVersion++;
        this.locked = true;
        this.lockReason = reason;
        this.updatedAt = Instant.now();
    }

    /**
     * Unlocks the user account.
     */
    public void unlock() {
        this.locked = false;
        this.lockReason = null;
        this.updatedAt = Instant.now();
    }

    /**
     * Ends every access and refresh token of the account, for example after a stolen refresh token was replayed.
     */
    public void endAllSessions() {
        this.sessionVersion++;
        this.updatedAt = Instant.now();
    }

    /**
     * Records a login event.
     */
    public void recordLogin() {
        this.lastLoginAt = Instant.now();
    }

    /**
     * Builder for User aggregate.
     */
    public static class Builder {
        private UUID id;
        private long revision;
        private long sessionVersion;

        public Builder revision(long value) {
            this.revision = value;
            return this;
        }

        public Builder sessionVersion(long value) {
            this.sessionVersion = value;
            return this;
        }
        private String username;
        private Email email;
        private Password password;
        private boolean passwordSet = true;
        private String firstName;
        private String lastName;
        private String phoneNumber;
        private String profileImageUrl;
        private Set<Role> roles = new HashSet<>();
        private boolean active = true;
        private boolean locked;
        private boolean emailVerified;
        private boolean onboardingCompleted = true;
        private PreferredLanguage preferredLanguage = PreferredLanguage.DEFAULT;
        private UserTimezone timezone = UserTimezone.DEFAULT;
        private String lockReason;
        private Instant lastLoginAt;
        private Instant createdAt;
        private Instant updatedAt;
        private int failedLoginAttempts;
        private Instant loginLockedUntil;

        /** Restores the stored count of consecutive wrong passwords. */
        public Builder failedLoginAttempts(int failedLoginAttempts) {
            this.failedLoginAttempts = failedLoginAttempts;
            return this;
        }

        /** Restores the stored end of the temporary sign-in lock. */
        public Builder loginLockedUntil(Instant loginLockedUntil) {
            this.loginLockedUntil = loginLockedUntil;
            return this;
        }

        /**
         * Sets the id.
         *
         * @param id the id
         * @return this builder
         */
        public Builder id(UUID id) {
            this.id = id;
            return this;
        }

        /**
         * Sets the username.
         *
         * @param username the username
         * @return this builder
         */
        public Builder username(String username) {
            this.username = username;
            return this;
        }

        /**
         * Sets the email.
         *
         * @param email the email
         * @return this builder
         */
        public Builder email(Email email) {
            this.email = email;
            return this;
        }

        /**
         * Sets the password.
         *
         * @param password the password
         * @return this builder
         */
        public Builder password(Password password) {
            this.password = password;
            return this;
        }

        /**
         * Restores whether the stored password is one the owner chose.
         *
         * @param passwordSet false for an unusable random password
         * @return this builder
         */
        public Builder passwordSet(boolean passwordSet) {
            this.passwordSet = passwordSet;
            return this;
        }

        /**
         * Sets the first name.
         *
         * @param firstName the first name
         * @return this builder
         */
        public Builder firstName(String firstName) {
            this.firstName = firstName;
            return this;
        }

        /** Restores the persisted private contact number. */
        public Builder phoneNumber(String phoneNumber) {
            this.phoneNumber = phoneNumber;
            return this;
        }

        public Builder lastName(String lastName) {
            this.lastName = lastName;
            return this;
        }

        /**
         * Sets the profile image URL.
         *
         * @param profileImageUrl the profile image URL
         * @return this builder
         */
        public Builder profileImageUrl(String profileImageUrl) {
            this.profileImageUrl = profileImageUrl;
            return this;
        }

        /**
         * Sets the roles.
         *
         * @param roles the roles
         * @return this builder
         */
        public Builder roles(Set<Role> roles) {
            this.roles = new HashSet<>(roles);
            return this;
        }

        /**
         * Sets active status.
         *
         * @param active the active status
         * @return this builder
         */
        public Builder active(boolean active) {
            this.active = active;
            return this;
        }

        /**
         * Sets locked status.
         *
         * @param locked the locked status
         * @return this builder
         */
        public Builder locked(boolean locked) {
            this.locked = locked;
            return this;
        }

        /**
         * Sets email verified status.
         *
         * @param emailVerified the email verified status
         * @return this builder
         */
        public Builder emailVerified(boolean emailVerified) {
            this.emailVerified = emailVerified;
            return this;
        }

        public Builder onboardingCompleted(boolean onboardingCompleted) {
            this.onboardingCompleted = onboardingCompleted;
            return this;
        }

        /** Restores the stored language; null keeps the default. */
        public Builder preferredLanguage(PreferredLanguage preferredLanguage) {
            this.preferredLanguage = Objects.requireNonNullElse(preferredLanguage, PreferredLanguage.DEFAULT);
            return this;
        }

        /** Restores the stored time zone; null keeps the default. */
        public Builder timezone(UserTimezone timezone) {
            this.timezone = Objects.requireNonNullElse(timezone, UserTimezone.DEFAULT);
            return this;
        }

        /**
         * Sets lock reason.
         *
         * @param lockReason the lock reason
         * @return this builder
         */
        public Builder lockReason(String lockReason) {
            this.lockReason = lockReason;
            return this;
        }

        /**
         * Sets last login at.
         *
         * @param lastLoginAt the last login timestamp
         * @return this builder
         */
        public Builder lastLoginAt(Instant lastLoginAt) {
            this.lastLoginAt = lastLoginAt;
            return this;
        }

        /**
         * Sets created at timestamp.
         *
         * @param createdAt the created at timestamp
         * @return this builder
         */
        public Builder createdAt(Instant createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        /**
         * Sets updated at timestamp.
         *
         * @param updatedAt the updated at timestamp
         * @return this builder
         */
        public Builder updatedAt(Instant updatedAt) {
            this.updatedAt = updatedAt;
            return this;
        }

        /**
         * Builds the User.
         *
         * @return the built User
         */
        public User build() {
            Objects.requireNonNull(id, "User id cannot be null");
            Objects.requireNonNull(email, "User email cannot be null");
            Objects.requireNonNull(password, "User password cannot be null");
            return new User(this);
        }
    }
}
