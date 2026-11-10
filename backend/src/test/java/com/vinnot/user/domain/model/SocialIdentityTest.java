package com.vinnot.user.domain.model;

import com.vinnot.user.domain.valueobject.SocialProvider;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNullPointerException;

class SocialIdentityTest {

    @Test
    void createsProviderIdentityWithStableTimestamps() {
        UUID userId = UUID.randomUUID();
        SocialIdentity identity = SocialIdentity.create(
                userId, SocialProvider.GOOGLE, "subject", "user@example.com");

        assertThat(identity.id()).isNotNull();
        assertThat(identity.userId()).isEqualTo(userId);
        assertThat(identity.createdAt()).isEqualTo(identity.updatedAt());
    }

    @Test
    void rejectsMissingProviderSubject() {
        assertThatNullPointerException().isThrownBy(() -> SocialIdentity.create(
                UUID.randomUUID(), SocialProvider.GOOGLE, null, null));
    }
}
