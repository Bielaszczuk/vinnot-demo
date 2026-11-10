package com.vinnot.admin.application.port.out;

import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserQueryPort {

    /**
     * Counts total users.
     *
     * @return the total count
     */
    long count();

    /**
     * Counts active users.
     *
     * @return the count of active users
     */
    long countActiveTrue();

    /**
     * Finds user data by ID.
     *
     * @param id the user ID
     * @return the user data if found
     */
    Optional<UserAdminData> findById(UUID id);

    /**
     * Gets all users paginated.
     *
     * @param pageQuery pagination info
     * @return page of user data
     */
    PageResult<UserAdminData> findAll(PageQuery pageQuery);

    /**
     * Searches users by keyword.
     *
     * @param keyword   the search keyword
     * @param pageQuery pagination info
     * @return page of matching user data
     */
    PageResult<UserAdminData> searchByKeyword(String keyword, PageQuery pageQuery);

    /**
     * Finds multiple users by their IDs (batch lookup).
     *
     * @param ids the user IDs
     * @return list of user data
     */
    List<UserAdminData> findAllByIds(Collection<UUID> ids);

    record UserAdminData(
            UUID id,
            String username,
            String email,
            String firstName,
            String lastName,
            String roles,
            boolean active,
            boolean locked,
            String lockReason,
            boolean emailVerified,
            String profileImageUrl,
            Instant lastLoginAt,
            Instant createdAt,
            Instant updatedAt
    ) {
    }
}
