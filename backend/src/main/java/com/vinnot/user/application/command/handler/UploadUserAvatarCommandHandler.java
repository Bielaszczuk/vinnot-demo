package com.vinnot.user.application.command.handler;

import com.vinnot.shared.application.port.AvatarUrlResolver;
import com.vinnot.shared.application.port.FileStoragePort;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.user.application.command.model.UploadUserAvatarCommand;
import com.vinnot.user.application.port.in.UploadUserAvatarUseCase;
import com.vinnot.user.application.port.out.ProfilePointsPort;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.domain.model.User;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UploadUserAvatarCommandHandler implements UploadUserAvatarUseCase {

    private static final Logger LOGGER =
            LoggerFactory.getLogger(UploadUserAvatarCommandHandler.class);

    private final UserRepositoryPort userRepository;
    private final FileStoragePort fileStorage;
    private final ProfilePointsPort points;
    private final AvatarUrlResolver avatars;

    @Override
    public String execute(UploadUserAvatarCommand command) {
        User user = userRepository.findById(command.userId())
                .orElseThrow(() -> new EntityNotFoundException("User", command.userId()));
        String previousAvatarUrl = user.getProfileImageUrl();
        String avatarUrl = fileStorage.storeAvatar(
                command.content(),
                command.originalFilename(),
                command.contentType(),
                command.size(),
                command.userId());
        try {
            user.updateProfileImage(avatarUrl);
            userRepository.save(user);
        } catch (RuntimeException exception) {
            deleteQuietly(avatarUrl, command.userId());
            throw exception;
        }
        rewardProfile(user);
        if (Objects.nonNull(previousAvatarUrl) && !previousAvatarUrl.isBlank()) {
            deleteQuietly(previousAvatarUrl, command.userId());
        }
        return avatars.resolve(avatarUrl);
    }

    /**
     * Awarded after the photo is stored (this upload runs no transaction of its own). A failure is logged and never
     * fails the upload: the photo stays and the next profile change awards the points.
     */
    private void rewardProfile(User user) {
        try {
            points.profileChanged(user);
        } catch (RuntimeException exception) {
            LOGGER.warn("Could not award profile points for userId={} failure={}",
                    user.getId(), exception.getClass().getSimpleName());
        }
    }

    private void deleteQuietly(String avatarUrl, UUID userId) {
        try {
            fileStorage.deleteAvatar(avatarUrl, userId);
        } catch (RuntimeException exception) {
            LOGGER.warn("Could not clean up managed avatar for userId={} failure={}",
                    userId, exception.getClass().getSimpleName());
        }
    }
}
