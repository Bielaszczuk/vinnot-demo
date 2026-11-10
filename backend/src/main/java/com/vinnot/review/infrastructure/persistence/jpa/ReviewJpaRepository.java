package com.vinnot.review.infrastructure.persistence.jpa;

import com.vinnot.review.infrastructure.persistence.entity.ReviewJpaEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;

@Repository
public interface ReviewJpaRepository extends JpaRepository<ReviewJpaEntity, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM ReviewJpaEntity r WHERE r.id = :id")
    Optional<ReviewJpaEntity> findByIdForUpdate(UUID id);

    @Query("SELECT r.wineId FROM ReviewJpaEntity r WHERE r.id = :id")
    Optional<UUID> findWineId(UUID id);

    Page<ReviewJpaEntity> findByWineIdOrderByCreatedAtDesc(UUID wineId, Pageable pageable);

    @Query("SELECT r FROM ReviewJpaEntity r WHERE r.wineId=:wineId AND (r.publicationStatus='APPROVED' OR r.userId=:viewerId) AND NOT EXISTS "
            + "(SELECT b.id FROM UserBlockJpaEntity b WHERE "
            + "(b.blockerId=:viewerId AND b.blockedId=r.userId) OR (b.blockedId=:viewerId AND b.blockerId=r.userId))")
    Page<ReviewJpaEntity> findVisibleByWineId(UUID wineId, UUID viewerId, Pageable pageable);

    @Query("SELECT COUNT(r)>0 FROM ReviewJpaEntity r WHERE r.id=:reviewId AND "
            + "(r.publicationStatus<>'APPROVED' OR EXISTS (SELECT b.id FROM UserBlockJpaEntity b WHERE "
            + "(b.blockerId=:viewerId AND b.blockedId=r.userId) OR (b.blockedId=:viewerId AND b.blockerId=r.userId)))")
    boolean isInteractionBlocked(UUID reviewId, UUID viewerId);

    @Query("SELECT r FROM ReviewJpaEntity r WHERE r.userId=:userId AND r.publicationStatus='APPROVED'")
    List<ReviewJpaEntity> findByUserId(UUID userId);

    @Query("SELECT r.userId AS id, COUNT(r.id) AS total "
            + "FROM ReviewJpaEntity r WHERE r.userId IN :userIds AND r.publicationStatus='APPROVED' "
            + "GROUP BY r.userId")
    List<IdCountProjection> countGroupedByUserId(
            @Param("userIds") Collection<UUID> userIds);

    Optional<ReviewJpaEntity> findByWineIdAndUserId(UUID wineId, UUID userId);

    @Query("SELECT r.wineId AS wineId, r.id AS reviewId FROM ReviewJpaEntity r WHERE r.userId=:userId AND r.wineId IN :wineIds")
    List<WineReviewIdProjection> findIdsByUserIdAndWineIds(@Param("userId") UUID userId, @Param("wineIds") Collection<UUID> wineIds);

    interface WineReviewIdProjection {
        UUID getWineId();
        UUID getReviewId();
    }

    boolean existsByWineIdAndUserId(UUID wineId, UUID userId);

    @Query("SELECT COUNT(r) FROM ReviewJpaEntity r WHERE r.wineId=:wineId AND r.publicationStatus='APPROVED'")
    long countByWineId(UUID wineId);

    @Query("SELECT AVG(r.rating) FROM ReviewJpaEntity r WHERE r.wineId = :wineId AND r.publicationStatus='APPROVED'")
    Double getAverageRatingByWineId(@Param("wineId") UUID wineId);

    @Query("SELECT r FROM ReviewJpaEntity r WHERE "
            + "LOWER(r.title) LIKE LOWER(CONCAT('%', CAST(:keyword AS string), '%')) OR "
            + "LOWER(r.comment) LIKE LOWER(CONCAT('%', CAST(:keyword AS string), '%')) OR "
            + "EXISTS (SELECT u.id FROM UserJpaEntity u WHERE u.id = r.userId AND "
            + "LOWER(u.username) LIKE LOWER(CONCAT('%', CAST(:keyword AS string), '%'))) OR "
            + "EXISTS (SELECT w.id FROM WineJpaEntity w WHERE w.id = r.wineId AND "
            + "LOWER(w.name) LIKE LOWER(CONCAT('%', CAST(:keyword AS string), '%')))")
    Page<ReviewJpaEntity> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

    interface IdCountProjection {
        UUID getId();

        long getTotal();
    }
}
