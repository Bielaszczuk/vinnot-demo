package com.vinnot.user.application.query.handler;

import com.vinnot.shared.application.port.AvatarUrlResolver;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.user.application.port.in.GetPublicUserProfileUseCase;
import com.vinnot.user.application.port.out.SocialProfilePort;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.application.query.model.GetPublicUserProfileQuery;
import com.vinnot.user.application.query.response.PublicUserProfileResponse;
import com.vinnot.user.domain.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** A member's public profile (#541): never for a missing or deactivated account, never private contact data. */
@Service
@RequiredArgsConstructor
public class GetPublicUserProfileQueryHandler implements GetPublicUserProfileUseCase {
    private final UserRepositoryPort users;
    private final SocialProfilePort social;
    private final AvatarUrlResolver avatars;

    @Override
    @Transactional(readOnly = true)
    public PublicUserProfileResponse execute(GetPublicUserProfileQuery query) {
        User user = users.findById(query.userId()).filter(User::isActive)
                .orElseThrow(() -> new EntityNotFoundException("User", query.userId()));
        return PublicUserProfileResponse.of(user, avatars.resolve(user.getProfileImageUrl()),
                social.profile(query.viewer(), query.userId()));
    }
}
