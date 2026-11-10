package com.vinnot.user.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import jakarta.persistence.Version;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "users")
public class UserJpaEntity {

    @Id
    private UUID id;

    @Version
    private long revision;

    @Column(name = "session_version", nullable = false)
    private long sessionVersion;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    /** False while the stored password is an unusable random one (social accounts, revoked passwords). */
    @Column(name = "password_set", nullable = false)
    private boolean passwordSet = true;

    @Column(name = "first_name", nullable = false)
    private String firstName;

    @Column(name = "last_name", nullable = false)
    private String lastName;

    @Column(name = "phone_number", length = 16)
    private String phoneNumber;

    @Column(name = "profile_image_url")
    private String profileImageUrl;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "user_roles",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    private Set<RoleJpaEntity> roles = new HashSet<>();

    @Column(nullable = false)
    private boolean active;

    @Column(nullable = false)
    private boolean locked;

    @Column(name = "email_verified", nullable = false)
    private boolean emailVerified;

    @Column(name = "onboarding_completed", nullable = false)
    private boolean onboardingCompleted;

    @Column(name = "preferred_language", nullable = false, length = 8)
    private String preferredLanguage = "es";

    @Column(nullable = false, length = 64)
    private String timezone = "America/Argentina/Buenos_Aires";

    @Column(name = "lock_reason")
    private String lockReason;

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    /**
     * Temporary sign-in lockout (#482). Read-only here: only {@code LoginAttemptPersistenceAdapter} writes these
     * columns, with atomic statements, so saving a loaded account never overwrites a concurrent failure count.
     */
    @Column(name = "failed_login_attempts", nullable = false, insertable = false, updatable = false)
    private int failedLoginAttempts;

    @Column(name = "login_locked_until", insertable = false, updatable = false)
    private Instant loginLockedUntil;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /**
     * Role enum for JPA persistence.
     * @deprecated Use {@link RoleJpaEntity} via ManyToMany instead.
     */
    @Deprecated
    public enum RoleEnum {
        ROLE_USER,
        ROLE_ADMIN,
        ROLE_MODERATOR,
        ROLE_PARTNER
    }
}
