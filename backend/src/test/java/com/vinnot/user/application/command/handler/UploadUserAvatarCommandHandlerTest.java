package com.vinnot.user.application.command.handler;

import com.vinnot.shared.infrastructure.storage.PublicAvatarUrlResolver;
import static org.mockito.Mockito.mock;
import com.vinnot.user.application.port.out.ProfilePointsPort;
import com.vinnot.shared.application.port.FileStoragePort;
import com.vinnot.user.application.command.model.UploadUserAvatarCommand;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.Password;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayInputStream;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UploadUserAvatarCommandHandlerTest {
    private final ProfilePointsPort points = mock(ProfilePointsPort.class);

    @Mock
    private UserRepositoryPort userRepository;
    @Mock
    private FileStoragePort fileStorage;

    private User user;
    private UploadUserAvatarCommand command;
    private UploadUserAvatarCommandHandler handler;

    @BeforeEach
    void setUp() {
        user = User.create(
                "avatar-owner",
                Email.of("avatar@vinnot.com"),
                Password.fromHash("hash"),
                "Avatar",
                "Owner");
        command = new UploadUserAvatarCommand(
                user.getId(),
                new ByteArrayInputStream(new byte[]{1, 2, 3}),
                "avatar.jpg",
                "image/jpeg",
                3);
        handler = new UploadUserAvatarCommandHandler(userRepository, fileStorage, points,
                new PublicAvatarUrlResolver("https://api.vinnot.test/api"));
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
    }

    @Test
    void persistsNewAvatarAndRemovesPreviouslyManagedObject() {
        String previous = "/api/uploads/avatars/avatar_" + user.getId() + "_old.jpg";
        String replacement = "/api/uploads/avatars/avatar_" + user.getId() + "_new.jpg";
        user.updateProfileImage(previous);
        when(fileStorage.storeAvatar(
                command.content(),
                command.originalFilename(),
                command.contentType(),
                command.size(),
                command.userId())).thenReturn(replacement);

        String result = handler.execute(command);

        assertThat(result).as("the response carries the URL clients load")
                .isEqualTo("https://api.vinnot.test" + replacement);
        assertThat(user.getProfileImageUrl()).as("the stored value stays relative").isEqualTo(replacement);
        verify(userRepository).save(user);
        verify(fileStorage).deleteAvatar(previous, user.getId());
        verify(points).profileChanged(user);
    }

    @Test
    void aPointsFailureNeverFailsTheUploadNorKeepsTheOldPhoto() {
        String previous = "/api/uploads/avatars/avatar_" + user.getId() + "_old.jpg";
        String replacement = "/api/uploads/avatars/avatar_" + user.getId() + "_new.jpg";
        user.updateProfileImage(previous);
        when(fileStorage.storeAvatar(command.content(), command.originalFilename(), command.contentType(),
                command.size(), command.userId())).thenReturn(replacement);
        doThrow(new IllegalStateException("points unavailable")).when(points).profileChanged(user);

        assertThat(handler.execute(command)).isEqualTo("https://api.vinnot.test" + replacement);

        verify(userRepository).save(user);
        verify(fileStorage).deleteAvatar(previous, user.getId());
    }

    @Test
    void removesNewObjectWhenProfilePersistenceFails() {
        String replacement = "/api/uploads/avatars/avatar_" + user.getId() + "_new.jpg";
        when(fileStorage.storeAvatar(
                command.content(),
                command.originalFilename(),
                command.contentType(),
                command.size(),
                command.userId())).thenReturn(replacement);
        doThrow(new IllegalStateException("database unavailable"))
                .when(userRepository).save(any(User.class));

        assertThatThrownBy(() -> handler.execute(command))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("database unavailable");

        verify(fileStorage).deleteAvatar(replacement, user.getId());
    }

    @Test
    void doesNotMaskSuccessfulReplacementWhenOldObjectCleanupFails() {
        String previous = "/api/uploads/avatars/avatar_" + user.getId() + "_old.jpg";
        String replacement = "/api/uploads/avatars/avatar_" + user.getId() + "_new.jpg";
        user.updateProfileImage(previous);
        when(fileStorage.storeAvatar(any(), any(), any(), anyLong(), any()))
                .thenReturn(replacement);
        doThrow(new IllegalStateException("storage unavailable"))
                .when(fileStorage).deleteAvatar(previous, user.getId());

        assertThat(handler.execute(command)).isEqualTo("https://api.vinnot.test" + replacement);
        assertThat(user.getProfileImageUrl()).isEqualTo(replacement);
    }
}
