package com.vinnot.user.application.query.handler;

import com.vinnot.shared.application.port.AvatarUrlResolver;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.user.application.port.in.SearchUsersUseCase;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.application.query.model.SearchUsersQuery;
import com.vinnot.user.application.query.response.UserResponse;
import com.vinnot.user.domain.model.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SearchUsersQueryHandler implements SearchUsersUseCase {

    private final UserRepositoryPort userRepository;
    private final AvatarUrlResolver avatars;

    @Override
    @Transactional(readOnly = true)
    public PageResult<UserResponse> execute(SearchUsersQuery query) {
        PageQuery pageQuery = PageQuery.of(
                query.page(), Math.min(query.size(), 100),
                "username", PageQuery.SortDirection.ASC);

        if (Objects.nonNull(query.search()) && !query.search().isBlank()) {
            return userRepository.searchByKeyword(query.search(), pageQuery)
                    .map(this::toResponse);
        }
        return userRepository.findAll(pageQuery).map(this::toResponse);
    }

    private UserResponse toResponse(User user) {
        return UserResponse.fromDomain(user, avatars.resolve(user.getProfileImageUrl()));
    }
}

