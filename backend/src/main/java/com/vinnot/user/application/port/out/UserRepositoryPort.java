package com.vinnot.user.application.port.out;

import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public interface UserRepositoryPort {

    Optional<User> findById(UUID id);

    Optional<User> findByEmail(Email email);

    Optional<User> findByEmailOrUsername(String identifier);

    boolean existsByEmail(Email email);

    boolean existsByUsername(String username);

    User save(User user);

    void delete(User user);

    List<User> findAllByIds(Collection<UUID> ids);

    /** Minimal identity projection, without credentials or role loading. */
    Map<UUID, String> findUsernamesByIds(Collection<UUID> ids);

    PageResult<User> findAll(PageQuery pageQuery);

    PageResult<User> searchByKeyword(String keyword, PageQuery pageQuery);

    boolean existsById(UUID id);

    void deleteById(UUID id);

    /** Locks active administrators until the surrounding transaction commits. */
    List<UUID> lockActiveAdministratorIds();

    long count();

    long countByActiveTrue();
}
