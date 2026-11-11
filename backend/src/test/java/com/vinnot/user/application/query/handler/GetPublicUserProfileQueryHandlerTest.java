package com.vinnot.user.application.query.handler;

import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.shared.infrastructure.storage.PublicAvatarUrlResolver;
import com.vinnot.user.application.port.out.SocialProfilePort;
import com.vinnot.user.application.port.out.SocialProfilePort.SocialProfile;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.application.query.model.GetPublicUserProfileQuery;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.Password;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** #541 S12: the public profile returns the avatar URL clients load and keeps its other fields. */
class GetPublicUserProfileQueryHandlerTest {
    private final UserRepositoryPort users = mock(UserRepositoryPort.class);
    private final SocialProfilePort social = mock(SocialProfilePort.class);
    private final GetPublicUserProfileQueryHandler handler = new GetPublicUserProfileQueryHandler(users, social,
            new PublicAvatarUrlResolver("https://api.vinnot.test/api"));

    @Test
    void returnsTheAbsoluteAvatarWithTheSocialFields() {
        User user = User.create("ana", Email.of("ana@vinnot.com"), Password.fromHash("hash"), "Ana", "Pérez");
        user.updateProfileImage("/api/uploads/avatars/ana.webp");
        UUID viewer = UUID.randomUUID();
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        when(social.profile(viewer, user.getId())).thenReturn(
                new SocialProfile("LAGAR", 3, 2, 5, 7L, true, true, false, 80, null, null));

        var profile = handler.execute(new GetPublicUserProfileQuery(viewer, user.getId()));

        assertThat(profile.avatarUrl()).isEqualTo("https://api.vinnot.test/api/uploads/avatars/ana.webp");
        assertThat(profile.username()).isEqualTo("ana");
        assertThat(profile.fullName()).isEqualTo("Ana Pérez");
        assertThat(profile.tier()).isEqualTo("LAGAR");
        assertThat(profile.followersCount()).isEqualTo(3);
        assertThat(profile.cellarCount()).isEqualTo(7L);
        assertThat(profile.affinityPercent()).isEqualTo(80);
    }

    @Test
    void hidesAMissingOrDeactivatedMember() {
        User inactive = User.create("gone", Email.of("gone@vinnot.com"), Password.fromHash("hash"), "Go", "Ne");
        inactive.deactivate();
        when(users.findById(inactive.getId())).thenReturn(Optional.of(inactive));
        UUID missing = UUID.randomUUID();
        when(users.findById(missing)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> handler.execute(new GetPublicUserProfileQuery(null, inactive.getId())))
                .isInstanceOf(EntityNotFoundException.class);
        assertThatThrownBy(() -> handler.execute(new GetPublicUserProfileQuery(null, missing)))
                .isInstanceOf(EntityNotFoundException.class);
    }
}
