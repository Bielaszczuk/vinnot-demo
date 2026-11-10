package com.vinnot.wineroute.infrastructure.persistence.adapter;

import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.wineroute.domain.model.WineRoute;
import com.vinnot.wineroute.domain.valueobject.RouteDifficulty;
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

/** The public wine route search filters on the real schema, difficulty included. */
@DataJpaTest(properties = {"spring.flyway.enabled=true", "spring.jpa.hibernate.ddl-auto=validate",
        "spring.jpa.open-in-view=false"})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(WineRoutePersistenceAdapter.class)
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class WineRouteSearchPostgresIntegrationTest {
    @Container
    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    private static final PageQuery FIRST_PAGE = PageQuery.of(0, 20, "name", PageQuery.SortDirection.ASC);

    @Autowired JdbcTemplate jdbc;
    @Autowired WineRoutePersistenceAdapter routes;

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @BeforeEach
    void routes() {
        jdbc.update("DELETE FROM wine_routes");
        UUID creator = user();
        route(creator, "Alta Malbec", "Argentina", "Mendoza", "SHORT", "PUBLISHED");
        route(creator, "Bajo Malbec", "Argentina", "Mendoza", "LONG", "PUBLISHED");
        route(creator, "Calchaquí Torrontés", "Argentina", "Salta", "SHORT", "PUBLISHED");
        route(creator, "Douro Classic", "Portugal", "Douro", null, "PUBLISHED");
        route(creator, "Escondida Malbec", "Argentina", "Mendoza", "SHORT", "DRAFT");
    }

    @Test
    void theDifficultyKeepsOnlyRoutesOfThatLength() {
        assertThat(names(routes.search(null, null, null, RouteDifficulty.SHORT, FIRST_PAGE)))
                .containsExactly("Alta Malbec", "Calchaquí Torrontés");
        assertThat(names(routes.search(null, null, null, RouteDifficulty.MEDIUM, FIRST_PAGE))).isEmpty();
    }

    @Test
    void theDifficultyCombinesWithTextCountryAndRegion() {
        PageResult<WineRoute> page = routes.search("malbec", "Argentina", "Mendoza", RouteDifficulty.LONG, FIRST_PAGE);

        assertThat(names(page)).containsExactly("Bajo Malbec");
        assertThat(page.totalElements()).isEqualTo(1);
        assertThat(names(routes.search(null, "Argentina", "Salta", RouteDifficulty.SHORT, FIRST_PAGE)))
                .containsExactly("Calchaquí Torrontés");
    }

    @Test
    void withoutADifficultyEveryPublishedRouteIsStillFound() {
        PageResult<WineRoute> page = routes.search(null, null, null, null, FIRST_PAGE);

        assertThat(names(page)).containsExactly("Alta Malbec", "Bajo Malbec", "Calchaquí Torrontés", "Douro Classic");
        assertThat(page.totalElements()).isEqualTo(4);
        assertThat(names(routes.search("malbec", "Argentina", "Mendoza", null, FIRST_PAGE)))
                .containsExactly("Alta Malbec", "Bajo Malbec");
    }

    private static List<String> names(PageResult<WineRoute> page) {
        return page.content().stream().map(WineRoute::getName).toList();
    }

    private void route(UUID creator, String name, String country, String region, String difficulty, String status) {
        jdbc.update("""
                INSERT INTO wine_routes(id,name,country,region,difficulty,status,created_by)
                VALUES (?,?,?,?,?,?,?)
                """, UUID.randomUUID(), name, country, region, difficulty, status, creator);
    }

    private UUID user() {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO users(id,username,email,password,first_name,last_name,preferred_language)
                VALUES (?,?,?,'fixture','Route','Creator','es')
                """, id, "user-" + id, id + "@example.invalid");
        return id;
    }
}
