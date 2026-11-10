package com.vinnot.admin.application.query.handler;

import com.vinnot.admin.application.port.in.SearchAdminUsersUseCase;
import com.vinnot.admin.application.port.out.UserPointsPort;
import com.vinnot.admin.application.port.out.UserQueryPort;
import com.vinnot.admin.application.query.model.SearchAdminUsersQuery;
import com.vinnot.admin.application.query.response.UserAdminResponse;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SearchAdminUsersQueryHandler implements SearchAdminUsersUseCase {

    private final UserQueryPort userQueryPort;
    private final UserPointsPort userPoints;

    @Override
    @Transactional(readOnly = true)
    public PageResult<UserAdminResponse> execute(SearchAdminUsersQuery query) {
        PageQuery pageQuery = PageQuery.of(query.page(), query.size(), "username", PageQuery.SortDirection.ASC);

        PageResult<UserQueryPort.UserAdminData> users = Objects.nonNull(query.search()) && !query.search().isBlank()
                ? userQueryPort.searchByKeyword(query.search(), pageQuery)
                : userQueryPort.findAll(pageQuery);
        List<UUID> userIds = users.content().stream().map(UserQueryPort.UserAdminData::id).toList();
        Map<UUID, UserPointsPort.Standing> standings = userIds.isEmpty() ? Map.of() : userPoints.standings(userIds);
        return users.map(user -> UserAdminResponse.fromData(user,
                standings.getOrDefault(user.id(), UserPointsPort.Standing.NONE)));
    }
}

