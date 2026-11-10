package com.vinnot.admin.infrastructure.persistence.adapter;

import com.vinnot.admin.application.port.out.UserQueryPort;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.domain.model.User;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;

@Component("adminUserQueryAdapter")
@RequiredArgsConstructor
public class UserQueryAdapter implements UserQueryPort {

    private final UserRepositoryPort userRepository;

    @Override
    public long count() {
        return userRepository.count();
    }

    @Override
    public long countActiveTrue() {
        return userRepository.countByActiveTrue();
    }

    @Override
    public Optional<UserAdminData> findById(UUID id) {
        return userRepository.findById(id).map(this::toUserAdminData);
    }

    @Override
    public PageResult<UserAdminData> findAll(PageQuery pageQuery) {
        return userRepository.findAll(pageQuery).map(this::toUserAdminData);
    }

    @Override
    public PageResult<UserAdminData> searchByKeyword(String keyword, PageQuery pageQuery) {
        return userRepository.searchByKeyword(keyword, pageQuery).map(this::toUserAdminData);
    }

    @Override
    public List<UserAdminData> findAllByIds(Collection<UUID> ids) {
        return userRepository.findAllByIds(ids).stream()
                .map(this::toUserAdminData)
                .toList();
    }

    private UserAdminData toUserAdminData(User user) {
        String roles = user.getRoles().stream()
                .map(Enum::name)
                .reduce((a, b) -> a + "," + b)
                .orElse("");
        return new UserAdminData(
                user.getId(),
                user.getUsername(),
                user.getEmail().getValue(),
                user.getFirstName(),
                user.getLastName(),
                roles,
                user.isActive(),
                user.isLocked(),
                user.getLockReason(),
                user.isEmailVerified(),
                user.getProfileImageUrl(),
                user.getLastLoginAt(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}

