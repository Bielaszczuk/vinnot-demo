package com.vinnot.user.application.command.handler;

import static org.mockito.Mockito.mock;
import com.vinnot.user.application.port.out.ProfilePointsPort;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.user.application.command.model.UpdateUserProfileCommand;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.Password;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import com.vinnot.shared.infrastructure.phone.LibPhoneNumberNormalizer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UpdateUserProfileCommandHandlerTest {
    private final ProfilePointsPort points = mock(ProfilePointsPort.class);

    @Mock
    private UserRepositoryPort userRepository;

    @Test
    void updatesAndNormalizesThePublicUsernameWithoutRequiringAName() {
        User user = socialUser();
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(userRepository.existsByUsername("copa.andina")).thenReturn(false);
        UpdateUserProfileCommandHandler handler =
                new UpdateUserProfileCommandHandler(userRepository, new LibPhoneNumberNormalizer(), points);

        handler.execute(new UpdateUserProfileCommand(
                user.getId(), " Copa.Andina ", "", null, null));

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getUsername()).isEqualTo("copa.andina");
        assertThat(captor.getValue().getFirstName()).isEmpty();
        verify(points).profileChanged(captor.getValue());
    }

    @Test
    void rejectsAnOccupiedUsernameDuringProfileEditing() {
        User user = socialUser();
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(userRepository.existsByUsername("copa.andina")).thenReturn(true);
        UpdateUserProfileCommandHandler handler =
                new UpdateUserProfileCommandHandler(userRepository, new LibPhoneNumberNormalizer(), points);

        assertThatThrownBy(() -> handler.execute(new UpdateUserProfileCommand(
                user.getId(), "copa.andina", null, null, null)))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("USERNAME_ALREADY_EXISTS");
        verify(userRepository, never()).save(user);
    }

    @Test
    void preservesSeparatedNamesWhenLegacyClientSendsTheCurrentFullName() {
        User user = User.create(
                "cris-vinnoter",
                Email.of("cris@vinnot.com"),
                Password.fromHash("hash"),
                "Cristhian",
                "Bielaszczuk");
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        UpdateUserProfileCommandHandler handler =
                new UpdateUserProfileCommandHandler(userRepository, new LibPhoneNumberNormalizer(), points);

        handler.execute(new UpdateUserProfileCommand(
                user.getId(), null, null, null,
                "Cristhian Bielaszczuk"));

        assertThat(user.getFirstName()).isEqualTo("Cristhian");
        assertThat(user.getLastName()).isEqualTo("Bielaszczuk");
        assertThat(user.getFullName()).isEqualTo("Cristhian Bielaszczuk");
    }

    @Test
    void updatesFirstAndLastNameIndependently() {
        User user = User.create(
                "cris-vinnoter",
                Email.of("cris@vinnot.com"),
                Password.fromHash("hash"),
                "Cristhian",
                "Bielaszczuk");
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        UpdateUserProfileCommandHandler handler =
                new UpdateUserProfileCommandHandler(userRepository, new LibPhoneNumberNormalizer(), points);

        handler.execute(new UpdateUserProfileCommand(
                user.getId(), null, "Christian", "Bielaszczuk", null));

        assertThat(user.getFirstName()).isEqualTo("Christian");
        assertThat(user.getLastName()).isEqualTo("Bielaszczuk");
    }

    @Test
    void keepsExistingNamesWhenNoNameInputIsProvided() {
        User user = namedUser();
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        new UpdateUserProfileCommandHandler(userRepository, new LibPhoneNumberNormalizer(), points).execute(
                new UpdateUserProfileCommand(user.getId(), null, null, null, null));

        assertThat(user.getFullName()).isEqualTo("Cristhian Bielaszczuk");
    }

    @Test
    void separatesLegacyFirstNameWhenKnownLastNameIsPreserved() {
        User user = namedUser();
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        new UpdateUserProfileCommandHandler(userRepository, new LibPhoneNumberNormalizer(), points).execute(
                new UpdateUserProfileCommand(
                        user.getId(), null, null, null, "Christian Bielaszczuk"));

        assertThat(user.getFirstName()).isEqualTo("Christian");
        assertThat(user.getLastName()).isEqualTo("Bielaszczuk");
    }

    @Test
    void treatsUnstructuredLegacyNameAsFirstName() {
        User user = namedUser();
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        new UpdateUserProfileCommandHandler(userRepository, new LibPhoneNumberNormalizer(), points).execute(
                new UpdateUserProfileCommand(user.getId(), null, null, null, "Vinnot Team"));

        assertThat(user.getFirstName()).isEqualTo("Vinnot Team");
        assertThat(user.getLastName()).isEmpty();
    }

    @Test
    void normalizesClearsAndPreservesPhoneWhenOlderClientsOmitIt() {
        User user = namedUser();
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        var handler = new UpdateUserProfileCommandHandler(userRepository,
                new LibPhoneNumberNormalizer(), points);
        handler.execute(new UpdateUserProfileCommand(user.getId(), null, null, null, null, "+54 9 11 2345-6789"));
        assertThat(user.getPhoneNumber()).isEqualTo("+5491123456789");
        verify(points).profileChanged(user);
        handler.execute(new UpdateUserProfileCommand(user.getId(), null, null, null, null));
        assertThat(user.getPhoneNumber()).isEqualTo("+5491123456789");
        handler.execute(new UpdateUserProfileCommand(user.getId(), null, null, null, null, ""));
        assertThat(user.getPhoneNumber()).isNull();
    }

    @Test
    void rejectsInvalidProfilePhoneWithoutSaving() {
        User user = namedUser();
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        var handler = new UpdateUserProfileCommandHandler(userRepository,
                new LibPhoneNumberNormalizer(), points);
        assertThatThrownBy(() -> handler.execute(new UpdateUserProfileCommand(
                user.getId(), null, null, null, null, "123")))
                .isInstanceOf(DomainException.class).extracting("code").isEqualTo("INVALID_PHONE_NUMBER");
        verify(userRepository, never()).save(user);
        verify(points, never()).profileChanged(any());
        assertThatThrownBy(() -> user.updatePhoneNumber("not-normalized"))
                .isInstanceOf(DomainException.class);
    }

    private User namedUser() {
        return User.create(
                "cris-vinnoter",
                Email.of("cris@vinnot.com"),
                Password.fromHash("hash"),
                "Cristhian",
                "Bielaszczuk");
    }

    private User socialUser() {
        return User.createSocial(
                "vinnoter-12345678",
                Email.of("social@vinnot.com"),
                Password.fromHash("hash"),
                "",
                "");
    }
}
