package com.vinnot.user.application.command.handler;

import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.user.application.command.model.UpdateUserPreferencesCommand;
import com.vinnot.user.application.port.in.UpdateUserPreferencesUseCase;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.PreferredLanguage;
import com.vinnot.user.domain.valueobject.UserTimezone;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UpdateUserPreferencesCommandHandler implements UpdateUserPreferencesUseCase {

    private final UserRepositoryPort userRepository;

    @Override
    @Transactional
    public UUID execute(UpdateUserPreferencesCommand command) {
        User user = userRepository.findById(command.userId())
                .orElseThrow(() -> new EntityNotFoundException("User", command.userId()));
        PreferredLanguage language = Objects.isNull(command.preferredLanguage())
                ? null : PreferredLanguage.of(command.preferredLanguage());
        UserTimezone zone = Objects.isNull(command.timezone())
                ? null : UserTimezone.of(command.timezone());

        // Clients sync on every login; an unchanged value must not bump the row revision.
        if (user.updatePreferences(language, zone)) {
            userRepository.save(user);
        }
        return user.getId();
    }
}
