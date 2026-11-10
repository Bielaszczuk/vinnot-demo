package com.vinnot.user.application.command.handler;

import com.vinnot.shared.application.port.PhoneNumberNormalizer;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.user.application.command.model.UpdateUserProfileCommand;
import com.vinnot.user.application.port.in.UpdateUserProfileUseCase;
import com.vinnot.user.application.port.out.ProfilePointsPort;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Username;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UpdateUserProfileCommandHandler implements UpdateUserProfileUseCase {

    private final UserRepositoryPort userRepository;
    private final PhoneNumberNormalizer phoneNumbers;
    private final ProfilePointsPort points;

    @Override
    @Transactional
    public UUID execute(UpdateUserProfileCommand command) {
        User user = userRepository.findById(command.userId())
                .orElseThrow(() -> new EntityNotFoundException("User", command.userId()));

        if (Objects.nonNull(command.username())) {
            String username = Username.of(command.username()).getValue();
            if (!username.equalsIgnoreCase(user.getUsername())
                    && userRepository.existsByUsername(username)) {
                throw new DomainException(
                        "USERNAME_ALREADY_EXISTS", "A user with this username already exists");
            }
            user.updateUsername(username);
        }

        ProfileName profileName = resolveProfileName(command, user);
        user.updateProfile(profileName.firstName(), profileName.lastName());
        if (Objects.nonNull(command.phoneNumber())) {
            user.updatePhoneNumber(phoneNumbers.normalizeOptional(command.phoneNumber()));
        }
        userRepository.save(user);
        points.profileChanged(user);
        return user.getId();
    }

    private ProfileName resolveProfileName(UpdateUserProfileCommand command, User user) {
        if (Objects.nonNull(command.firstName()) || Objects.nonNull(command.lastName())) {
            return new ProfileName(
                    normalizeOrExisting(command.firstName(), user.getFirstName()),
                    normalizeOrExisting(command.lastName(), user.getLastName()));
        }

        if (Objects.isNull(command.legacyName()) || command.legacyName().isBlank()) {
            return new ProfileName(user.getFirstName(), user.getLastName());
        }

        String legacyName = command.legacyName().trim();
        String currentLastName = user.getLastName();
        if (!currentLastName.isBlank()) {
            String suffix = " " + currentLastName;
            if (legacyName.equals(user.getFullName())) {
                return new ProfileName(user.getFirstName(), currentLastName);
            }
            if (legacyName.endsWith(suffix)) {
                return new ProfileName(
                        legacyName.substring(0, legacyName.length() - suffix.length()).trim(),
                        currentLastName);
            }
        }

        return new ProfileName(legacyName, "");
    }

    private String normalizeOrExisting(String value, String existingValue) {
        return Objects.nonNull(value) ? value.trim() : existingValue;
    }

    private record ProfileName(String firstName, String lastName) {
    }
}
