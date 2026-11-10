package com.vinnot.user.infrastructure.persistence.jpa;

import com.vinnot.user.infrastructure.persistence.entity.UserJpaEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;
import java.util.Collection;
import java.util.List;

@Repository
public interface UserJpaRepository extends JpaRepository<UserJpaEntity, UUID> {

    Optional<UserJpaEntity> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByUsernameIgnoreCase(String username);

    Optional<UserJpaEntity> findByUsername(String username);

    Optional<UserJpaEntity> findByEmailIgnoreCaseOrUsernameIgnoreCase(String email, String username);

    @Query(value = """
            SELECT u.id FROM users u WHERE u.active = true AND u.locked = false
            AND EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
                        WHERE ur.user_id = u.id AND r.name = 'ROLE_ADMIN')
            ORDER BY u.id FOR UPDATE OF u
            """, nativeQuery = true)
    List<UUID> lockActiveAdministratorIds();

    interface UsernameProjection {
        UUID getId();
        String getUsername();
    }

    @Query("SELECT u.id AS id, u.username AS username FROM UserJpaEntity u WHERE u.id IN :ids")
    List<UsernameProjection> findUsernamesByIds(@Param("ids") Collection<UUID> ids);

    long countByActiveTrue();

    @Query("SELECT u FROM UserJpaEntity u WHERE "
            + "LOWER(u.username) LIKE LOWER(CONCAT('%', CAST(:keyword AS string), '%')) OR "
            + "LOWER(u.email) LIKE LOWER(CONCAT('%', CAST(:keyword AS string), '%')) OR "
            + "LOWER(u.firstName) LIKE LOWER(CONCAT('%', CAST(:keyword AS string), '%')) OR "
            + "LOWER(u.lastName) LIKE LOWER(CONCAT('%', CAST(:keyword AS string), '%'))")
    Page<UserJpaEntity> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);
}
