package com.vinnot.user.domain.model;

import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.Password;
import com.vinnot.user.domain.valueobject.PreferredLanguage;
import com.vinnot.user.domain.valueobject.Role;
import com.vinnot.user.domain.valueobject.UserTimezone;
import org.junit.jupiter.api.Test;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UserTest {

    @Test
    void onlyAPasswordTheOwnerChoseCountsAsHavingOne() {
        User local = User.create("local-user", Email.of("local@vinnot.com"), Password.fromHash("hash"), "Lo", "Cal");
        User social = User.createSocial("vinnoter-abc12345", Email.of("social@vinnot.com"),
                Password.fromHash("unusable"), "So", "Cial");
        long socialSessions = social.getSessionVersion();

        assertThat(local.hasPassword()).isTrue();
        assertThat(social.hasPassword()).isFalse();

        social.changePassword(Password.fromHash("chosen-through-reset"));
        local.revokePassword(Password.fromHash("unusable"));

        assertThat(social.hasPassword()).isTrue();
        assertThat(social.getSessionVersion()).isEqualTo(socialSessions + 1);
        assertThat(local.hasPassword()).isFalse();
        assertThat(local.getPassword().getHashedValue()).isEqualTo("unusable");
    }


    @Test
    void createsARegularUserWithSafeDefaults() {
        User user = regularUser();

        assertThat(user.getUsername()).isEqualTo("wine-user");
        assertThat(user.getFullName()).isEqualTo("Wine User");
        assertThat(user.getRoles()).containsExactly(Role.USER);
        assertThat(user.isActive()).isTrue();
        assertThat(user.isOnboardingCompleted()).isTrue();
        assertThat(user.isEmailVerified()).isFalse();
    }

    @Test
    void preservesExistingProfileDataDuringSocialEnrichment() {
        User user = regularUser();
        user.updateProfileImage("existing.jpg");

        user.enrichFromIdentityProvider("Provider", "Identity", "provider.jpg");

        assertThat(user.getFirstName()).isEqualTo("Wine");
        assertThat(user.getLastName()).isEqualTo("User");
        assertThat(user.getProfileImageUrl()).isEqualTo("existing.jpg");
    }

    @Test
    void managesRolesAndPreventsRemovingTheLastAuthorizationRole() {
        User user = regularUser();
        user.addRole(Role.ADMIN);
        user.removeRole(Role.USER);

        assertThat(user.getRoles()).containsExactly(Role.ADMIN);
        assertThatThrownBy(() -> user.removeRole(Role.ADMIN))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("ROLE_REMOVAL_DENIED");
    }

    @Test
    void managesVerificationLockAndActivationLifecycle() {
        User user = regularUser();
        user.changeVerifiedEmail(Email.of("new@example.com"));
        user.lock("abuse");
        user.deactivate();

        assertThat(user.getEmail()).isEqualTo(Email.of("new@example.com"));
        assertThat(user.isEmailVerified()).isTrue();
        assertThat(user.isLocked()).isTrue();
        assertThat(user.getLockReason()).isEqualTo("abuse");
        assertThat(user.isActive()).isFalse();

        user.unlock();
        user.activate();
        user.recordLogin();
        assertThat(user.isLocked()).isFalse();
        assertThat(user.isActive()).isTrue();
        assertThat(user.getLastLoginAt()).isNotNull();
    }

    @Test
    void startsWithSpanishAndBuenosAiresPreferences() {
        User user = regularUser();

        assertThat(user.getPreferredLanguage()).isEqualTo(PreferredLanguage.DEFAULT);
        assertThat(user.getTimezone()).isEqualTo(UserTimezone.DEFAULT);
    }

    @Test
    void updatesOnlyTheProvidedPreferencesAndReportsChanges() {
        User user = regularUser();

        assertThat(user.updatePreferences(PreferredLanguage.of("en"), null)).isTrue();
        assertThat(user.getPreferredLanguage().getValue()).isEqualTo("en");
        assertThat(user.getTimezone()).isEqualTo(UserTimezone.DEFAULT);

        assertThat(user.updatePreferences(null, UserTimezone.of("Europe/Madrid"))).isTrue();
        assertThat(user.getPreferredLanguage().getValue()).isEqualTo("en");
        assertThat(user.getTimezone().getValue()).isEqualTo("Europe/Madrid");
    }

    @Test
    void reportsNoChangeWhenPreferencesAreAlreadyStored() {
        User user = regularUser();
        Instant before = user.getUpdatedAt();

        assertThat(user.updatePreferences(PreferredLanguage.DEFAULT, UserTimezone.DEFAULT)).isFalse();
        assertThat(user.updatePreferences(null, null)).isFalse();
        assertThat(user.getUpdatedAt()).isEqualTo(before);
    }

    private User regularUser() {
        return User.create(
                "wine-user",
                Email.of("user@example.com"),
                Password.fromHash("hash"),
                "Wine",
                "User");
    }
}
