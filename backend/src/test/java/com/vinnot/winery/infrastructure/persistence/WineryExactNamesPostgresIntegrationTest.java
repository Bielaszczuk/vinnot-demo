package com.vinnot.winery.infrastructure.persistence;

import com.vinnot.winery.application.port.out.WineryRepositoryPort;
import com.vinnot.winery.infrastructure.persistence.adapter.WineryPersistenceAdapter;
import com.vinnot.wineroute.infrastructure.persistence.adapter.WineryQueryAdapter;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** Verify exact route enrichment and a constant SQL count on the real persistence stack. */
@DataJpaTest(properties = {
        "spring.flyway.enabled=true", "spring.jpa.hibernate.ddl-auto=validate",
        "spring.jpa.open-in-view=false", "spring.jpa.properties.hibernate.generate_statistics=true"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({WineryPersistenceAdapter.class, WineryQueryAdapter.class})
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class WineryExactNamesPostgresIntegrationTest {
    @Container
    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    @Autowired JdbcTemplate jdbc;
    @Autowired WineryQueryAdapter query;
    @Autowired WineryRepositoryPort repository;
    @Autowired EntityManagerFactory entityManagerFactory;

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Test
    void resolvesOnlyActiveExactNamesIncludingContactsInOneQuery() {
        UUID country = UUID.randomUUID();
        UUID region = UUID.randomUUID();
        jdbc.update("INSERT INTO countries(id,code,name) VALUES (?,'fixture','Country')", country);
        jdbc.update("INSERT INTO regions(id,name,country_id) VALUES (?,'Region',?)", region, country);
        insert("Casa Yagüe", true, country, region);
        insert("Chacra Baruk", true, country, region);
        insert("Casa Yagüe Extended", true, country, region);
        insert("Inactive", false, country, region);
        var stats = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        stats.clear();

        var found = query.findByExactNames(List.of("CASA YAGÜE", "Chacra Baruk", "Missing", "Inactive", "CASA YAGÜE"));

        assertThat(found).extracting(value -> value.name()).containsExactly("Casa Yagüe", "Chacra Baruk");
        assertThat(found).allSatisfy(value -> {
            assertThat(value.country()).isEqualTo("Country");
            assertThat(value.region()).isEqualTo("Region");
            assertThat(value.email()).isEqualTo("fixture@example.invalid");
            assertThat(value.phone()).isEqualTo("+54");
            assertThat(value.address()).isEqualTo("Address");
        });
        assertThat(stats.getPrepareStatementCount()).isEqualTo(1);
        assertThat(stats.getEntityFetchCount()).isZero();
    }

    @Test
    void emptySelectionDoesNotQueryTheCatalogue() {
        var stats = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        stats.clear();
        assertThat(query.findByExactNames(List.of())).isEmpty();
        assertThat(repository.findActiveByExactNames(List.of("", " "))).isEmpty();
        assertThat(stats.getPrepareStatementCount()).isZero();
    }

    @Test
    void countsOnlyActiveCatalogWinesForTheSelectedPageInOneQuery() {
        UUID first = UUID.randomUUID(), second = UUID.randomUUID(), empty = UUID.randomUUID();
        for (UUID id : List.of(first, second, empty)) {
            jdbc.update("INSERT INTO wineries(id,name,wines_count) VALUES (?, 'Count fixture', 999)", id);
        }
        for (boolean active : List.of(true, true, false)) {
            jdbc.update("INSERT INTO wines(id,name,winery_id,wine_type,is_active) VALUES (?, 'Wine', ?, 'RED', ?)",
                    UUID.randomUUID(), first, active);
        }
        jdbc.update("INSERT INTO wines(id,name,winery_id,wine_type) VALUES (?, 'Other', ?, 'RED')",
                UUID.randomUUID(), second);
        var stats = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        stats.clear();
        var counts = repository.countActiveWinesByWineryIds(List.of(first, empty));
        assertThat(counts).containsEntry(first, 2).doesNotContainKey(second);
        assertThat(counts.getOrDefault(empty, 0)).isZero();
        assertThat(stats.getPrepareStatementCount()).isEqualTo(1);
        assertThat(repository.countActiveWinesByWineryIds(List.of())).isEmpty();
        assertThat(stats.getPrepareStatementCount()).isEqualTo(1);
    }

    private void insert(String name, boolean active, UUID country, UUID region) {
        jdbc.update("""
                INSERT INTO wineries(id,name,is_active,country_id,region_id,address,email,phone)
                VALUES (?,?,?,?,?,'Address','fixture@example.invalid','+54')
                """, UUID.randomUUID(), name, active, country, region);
    }
}
