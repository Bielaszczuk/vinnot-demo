package com.vinnot.wine.infrastructure.persistence;

import com.vinnot.wine.domain.model.WineSubmissionStatus;
import com.vinnot.wine.infrastructure.persistence.entity.WineSubmissionJpaEntity;
import com.vinnot.wine.infrastructure.persistence.jpa.WineSubmissionJpaRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(properties = {
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class WineSubmissionPostgresIntegrationTest {

    @Container
    private static final PostgreSQLContainer POSTGRES =
            new PostgreSQLContainer("postgres:18-alpine");

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired
    private WineSubmissionJpaRepository repository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void persistsJsonAndFiltersNeedsReviewWithPostgres() {
        UUID userId = UUID.randomUUID();
        jdbcTemplate.update("""
                INSERT INTO users (
                    id, email, password, first_name, last_name, username,
                    active, email_verified, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, true, true, now(), now())
                """, userId, "scan-test@example.com", "test-password",
                "Scan", "Test", "scan-test");
        WineSubmissionJpaEntity entity = new WineSubmissionJpaEntity();
        entity.setId(UUID.randomUUID());
        entity.setSubmittedBy(userId);
        entity.setWineName("Malbec Reserva");
        entity.setWineryName("Bodega Norte");
        entity.setGrapes(List.of("Malbec"));
        entity.setStatus(WineSubmissionStatus.NEEDS_REVIEW);
        entity.setImageQuarantined(true);
        entity.setCreatedAt(Instant.now());
        entity.setUpdatedAt(Instant.now());
        repository.saveAndFlush(entity);

        var result = repository.search(
                WineSubmissionStatus.NEEDS_REVIEW, "reserva", PageRequest.of(0, 20));

        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent().getFirst().getGrapes()).containsExactly("Malbec");
        assertThat(result.getContent().getFirst().isImageQuarantined()).isTrue();
    }
}
