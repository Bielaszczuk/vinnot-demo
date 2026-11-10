package com.vinnot.ai.infrastructure.persistence.repository;

import com.vinnot.ai.infrastructure.persistence.mapper.WineAiProfileMapperImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(properties = {"spring.flyway.enabled=true", "spring.jpa.hibernate.ddl-auto=validate"})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({WineAiProfileRepositoryAdapter.class, WineAiProfileMapperImpl.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class WineAiProfileRepositoryPostgresIntegrationTest {
    @Container
    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    private static final UUID FIRST = UUID.fromString("00000000-0000-0000-0000-00000000000a");
    private static final UUID SECOND = UUID.fromString("00000000-0000-0000-0000-00000000000b");
    private static final UUID THIRD = UUID.fromString("00000000-0000-0000-0000-00000000000c");

    @Autowired
    private WineAiProfileRepositoryAdapter repository;
    @Autowired
    private JdbcTemplate jdbc;

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @BeforeEach
    void clearProfiles() {
        jdbc.execute("TRUNCATE wines CASCADE");
        for (UUID wineId : new UUID[] {FIRST, SECOND, THIRD}) {
            jdbc.update("INSERT INTO wines(id, name, wine_type, is_active) VALUES (?, 'Profiled', 'RED', true)", wineId);
        }
    }

    @Test
    void returnsNoWineIdsWhenNothingIsStored() {
        assertThat(repository.findWineIdsAfter(null, 10)).isEmpty();
    }

    @Test
    void pagesDistinctProfiledWineIdsInAStableOrderAfterTheCursor() {
        // Inserted out of order, and the first wine has both languages.
        insert(THIRD, "en");
        insert(FIRST, "es");
        insert(SECOND, "es");
        insert(FIRST, "en");

        assertThat(repository.findWineIdsAfter(null, 2)).containsExactly(FIRST, SECOND);
        assertThat(repository.findWineIdsAfter(SECOND, 2)).containsExactly(THIRD);
        assertThat(repository.findWineIdsAfter(THIRD, 2)).isEmpty();
        assertThat(repository.findWineIdsAfter(null, 10)).containsExactly(FIRST, SECOND, THIRD);
    }

    private void insert(UUID wineId, String language) {
        jdbc.update("INSERT INTO wine_ai_profiles (wine_id, language, profile_json) VALUES (?, ?, '{}'::jsonb)",
                wineId, language);
    }
}
