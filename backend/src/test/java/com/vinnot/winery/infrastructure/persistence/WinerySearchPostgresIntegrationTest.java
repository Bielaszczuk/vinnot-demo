package com.vinnot.winery.infrastructure.persistence;

import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.winery.application.port.out.WineryRepositoryPort;
import com.vinnot.winery.domain.model.Winery;
import com.vinnot.winery.infrastructure.persistence.adapter.WineryPersistenceAdapter;
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
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The admin and public winery lists send the country name ({@code ?country=Argentina}); the filter used to
 * compare it with the lowercase ISO code only, so any country filter returned no wineries.
 */
@DataJpaTest(properties = {
        "spring.flyway.enabled=true", "spring.jpa.hibernate.ddl-auto=validate",
        "spring.jpa.open-in-view=false"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(WineryPersistenceAdapter.class)
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class WinerySearchPostgresIntegrationTest {
    @Container
    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    @Autowired JdbcTemplate jdbc;
    @Autowired WineryRepositoryPort repository;

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @BeforeEach
    void seedWineries() {
        // V2 seeds Argentina with the lowercase ISO code 'ar'.
        UUID argentina = jdbc.queryForObject("SELECT id FROM countries WHERE code = 'ar'", UUID.class);
        UUID otherCountry = UUID.randomUUID();
        jdbc.update("INSERT INTO countries(id,code,name) VALUES (?,'zz-search','Search Fixture Land')", otherCountry);
        UUID region = UUID.randomUUID();
        jdbc.update("INSERT INTO regions(id,name,country_id) VALUES (?,'Search Fixture Valley',?)", region, argentina);
        insert("Zuccardi", argentina, region);
        insert("Zuccardi Abroad", otherCountry, null);
    }

    @Test
    void searchWithCountryNameReturnsTheMatchingWinery() {
        assertThat(names(repository.search("zuccardi", "Argentina", null, PageQuery.of(0, 20))))
                .containsExactly("Zuccardi");
    }

    @Test
    void countryNameAloneFiltersWineries() {
        assertThat(names(repository.search(null, "Argentina", null, PageQuery.of(0, 20))))
                .containsExactly("Zuccardi");
        assertThat(names(repository.search(null, "argentina", null, PageQuery.of(0, 20))))
                .as("the country name matches regardless of case")
                .containsExactly("Zuccardi");
    }

    @Test
    void countryCodeStillFiltersWineries() {
        assertThat(names(repository.search("zuccardi", "ar", null, PageQuery.of(0, 20))))
                .containsExactly("Zuccardi");
        assertThat(names(repository.search(null, "AR", null, PageQuery.of(0, 20))))
                .containsExactly("Zuccardi");
    }

    @Test
    void searchWithoutCountryKeepsReturningEveryMatch() {
        assertThat(names(repository.search("zuccardi", null, null, PageQuery.of(0, 20))))
                .containsExactly("Zuccardi", "Zuccardi Abroad");
        assertThat(names(repository.search(null, "Nowhere", null, PageQuery.of(0, 20)))).isEmpty();
    }

    @Test
    void regionNameFiltersWineriesRegardlessOfCase() {
        assertThat(names(repository.search(null, null, "Search Fixture Valley", PageQuery.of(0, 20))))
                .containsExactly("Zuccardi");
        assertThat(names(repository.search("zuccardi", "Argentina", "search fixture valley", PageQuery.of(0, 20))))
                .containsExactly("Zuccardi");
    }

    private static List<String> names(PageResult<Winery> page) {
        return page.content().stream().map(Winery::getName).toList();
    }

    private void insert(String name, UUID country, UUID region) {
        jdbc.update("INSERT INTO wineries(id,name,is_active,country_id,region_id) VALUES (?,?,true,?,?)",
                UUID.randomUUID(), name, country, region);
    }
}
