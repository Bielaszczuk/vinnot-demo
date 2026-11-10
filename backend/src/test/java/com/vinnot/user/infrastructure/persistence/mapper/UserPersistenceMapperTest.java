package com.vinnot.user.infrastructure.persistence.mapper;

import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.Password;
import com.vinnot.user.domain.valueobject.PreferredLanguage;
import com.vinnot.user.domain.valueobject.UserTimezone;
import com.vinnot.user.infrastructure.persistence.entity.UserJpaEntity;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class UserPersistenceMapperTest {

    @Test
    void roundTripsWhetherTheAccountHasAPasswordItsOwnerChose() {
        User social = User.createSocial("vinnoter-abc12345", Email.of("social@vinnot.com"),
                Password.fromHash("unusable"), "So", "Cial");

        UserJpaEntity entity = UserPersistenceMapper.toEntity(social);
        assertThat(entity.isPasswordSet()).isFalse();
        assertThat(UserPersistenceMapper.toDomain(entity).hasPassword()).isFalse();

        entity.setPasswordSet(true);
        assertThat(UserPersistenceMapper.toDomain(entity).hasPassword()).isTrue();
    }


    @Test
    void roundTripsLanguageAndTimezone() {
        User user = user();
        user.updatePreferences(PreferredLanguage.of("en"), UserTimezone.of("Europe/Madrid"));

        UserJpaEntity entity = UserPersistenceMapper.toEntity(user);
        User restored = UserPersistenceMapper.toDomain(entity);

        assertThat(entity.getPreferredLanguage()).isEqualTo("en");
        assertThat(entity.getTimezone()).isEqualTo("Europe/Madrid");
        assertThat(restored.getPreferredLanguage().getValue()).isEqualTo("en");
        assertThat(restored.getTimezone().getValue()).isEqualTo("Europe/Madrid");
    }

    @Test
    void anUnrecognisedStoredZoneFallsBackToTheDefaultInsteadOfFailingToLoad() {
        UserJpaEntity entity = UserPersistenceMapper.toEntity(user());
        entity.setTimezone("Removed/Zone");

        assertThat(UserPersistenceMapper.toDomain(entity).getTimezone()).isEqualTo(UserTimezone.DEFAULT);
    }

    @Test
    void readsTheTemporarySignInLockAndKeepsItOnTheEntityItBuilds() {
        UserJpaEntity entity = UserPersistenceMapper.toEntity(user());
        entity.setFailedLoginAttempts(3);
        entity.setLoginLockedUntil(Instant.parse("2026-10-29T12:15:00Z"));

        User restored = UserPersistenceMapper.toDomain(entity);
        assertThat(restored.getFailedLoginAttempts()).isEqualTo(3);
        assertThat(restored.getLoginLockedUntil()).isEqualTo(Instant.parse("2026-10-29T12:15:00Z"));

        UserJpaEntity again = UserPersistenceMapper.toEntity(restored);
        assertThat(again.getFailedLoginAttempts()).isEqualTo(3);
        assertThat(again.getLoginLockedUntil()).isEqualTo(restored.getLoginLockedUntil());
    }

    private User user() {
        return User.create(
                "wine-user", Email.of("user@example.com"), Password.fromHash("hash"), "Wine", "User");
    }
}
