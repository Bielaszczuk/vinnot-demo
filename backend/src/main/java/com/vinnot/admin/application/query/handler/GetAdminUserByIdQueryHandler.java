package com.vinnot.admin.application.query.handler;

import com.vinnot.shared.application.port.AvatarUrlResolver;
import com.vinnot.admin.application.port.in.GetAdminUserByIdUseCase;
import com.vinnot.admin.application.port.out.UserPointsPort;
import com.vinnot.admin.application.port.out.UserQueryPort;
import com.vinnot.admin.application.query.model.GetAdminUserByIdQuery;
import com.vinnot.admin.application.query.response.UserAdminResponse;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;

import java.util.List;

@Service
@RequiredArgsConstructor
public class GetAdminUserByIdQueryHandler implements GetAdminUserByIdUseCase {

    private final UserQueryPort userQueryPort;
    private final UserPointsPort userPoints;
    private final AvatarUrlResolver avatars;

    @Override
    @Transactional(readOnly = true)
    public UserAdminResponse execute(GetAdminUserByIdQuery query) {
        UserQueryPort.UserAdminData user = userQueryPort.findById(query.userId())
                .orElseThrow(() -> new EntityNotFoundException("User", query.userId()));
        return UserAdminResponse.fromData(user,
                userPoints.standings(List.of(user.id())).getOrDefault(user.id(), UserPointsPort.Standing.NONE),
                avatars.resolve(user.profileImageUrl()));
    }
}

