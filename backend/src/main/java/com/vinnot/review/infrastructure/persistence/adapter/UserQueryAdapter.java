package com.vinnot.review.infrastructure.persistence.adapter;

import com.vinnot.review.application.port.out.UserQueryPort;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;

@Component("reviewUserQueryAdapter")
@RequiredArgsConstructor
public class UserQueryAdapter implements UserQueryPort {

    private final UserRepositoryPort userRepository;

    @Override
    public Optional<UserData> findById(UUID userId) {
        return userRepository.findById(userId).map(this::toUserData);
    }

    @Override
    public List<UserData> findAllByIds(Collection<UUID> ids) {
        return userRepository.findAllByIds(ids).stream()
                .map(this::toUserData)
                .toList();
    }

    private UserData toUserData(User user) {
        return new UserData(
                user.getId(),
                user.getUsername(),
                user.getFirstName(),
                user.getLastName(),
                user.getProfileImageUrl()
        );
    }
}

