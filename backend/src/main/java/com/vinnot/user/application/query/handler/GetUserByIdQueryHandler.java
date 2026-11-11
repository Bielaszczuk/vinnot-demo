package com.vinnot.user.application.query.handler;

import com.vinnot.shared.application.port.AvatarUrlResolver;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.user.application.port.in.GetUserByIdUseCase;
import com.vinnot.user.application.port.out.SocialIdentityRepositoryPort;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.application.query.model.GetUserByIdQuery;
import com.vinnot.user.application.query.response.UserResponse;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.model.SocialIdentity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GetUserByIdQueryHandler implements GetUserByIdUseCase {

    private final UserRepositoryPort userRepository;
    private final SocialIdentityRepositoryPort socialIdentityRepository;
    private final AvatarUrlResolver avatars;

    @Override
    @Transactional(readOnly = true)
    public UserResponse execute(GetUserByIdQuery query) {
        User user = userRepository.findById(query.userId())
                .orElseThrow(() -> new EntityNotFoundException("User", query.userId()));
        return UserResponse.fromDomain(
                user,
                socialIdentityRepository.findByUserId(user.getId()).stream()
                        .map(SocialIdentity::provider)
                        .map(Enum::name)
                        .collect(Collectors.toUnmodifiableSet()),
                avatars.resolve(user.getProfileImageUrl()));
    }
}
