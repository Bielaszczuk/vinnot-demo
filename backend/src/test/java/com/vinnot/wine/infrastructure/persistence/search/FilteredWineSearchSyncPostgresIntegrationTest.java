package com.vinnot.wine.infrastructure.persistence.search;

import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.application.service.WineLabelImagePublicationService;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.infrastructure.persistence.adapter.WinePersistenceAdapter;
import org.junit.jupiter.api.AfterEach;
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

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The filtered search read model ({@code wine_catalog_filter_search}) and the grape index ({@code wine_grape_search}
 * plus its key dictionary) are maintained by triggers, so every wine write path, including the previous backend
 * during a migration window, keeps them current. These tests write wines with plain SQL and read both structures
 * and the repository results.
 */
@DataJpaTest(properties = {
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.jpa.open-in-view=false"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({WinePersistenceAdapter.class, WineSearchNativeRepository.class, WineLabelImagePublicationService.class})
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class FilteredWineSearchSyncPostgresIntegrationTest {

    @Container
    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    private final UUID wineId = UUID.randomUUID();
    private final UUID wineryId = UUID.randomUUID();
    private final UUID otherWineryId = UUID.randomUUID();
    private UUID argentina;
    private UUID chile;
    private UUID region;

    @Autowired
    private WineRepositoryPort wineRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @BeforeEach
    void insertWine() {
        argentina = jdbcTemplate.queryForObject("SELECT id FROM countries WHERE name = 'Argentina'", UUID.class);
        chile = jdbcTemplate.queryForObject("SELECT id FROM countries WHERE name = 'Chile'", UUID.class);
        region = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO regions (id, name, country_id) VALUES (?, ?, ?)",
                region, "Sync region " + region, argentina);
        jdbcTemplate.update("INSERT INTO wineries (id, name, is_active) VALUES (?, 'Bodega Sincronia', true), "
                + "(?, 'Otra Bodega', true)", wineryId, otherWineryId);
        jdbcTemplate.update("""
                INSERT INTO wines (id, name, wine_type, is_active, winery_id, country_id, region_id, grapes)
                VALUES (?, 'Sincronia Reserva', 'RED', true, ?, ?, ?, '["Malbec", " Cabernet Franc "]')
                """, wineId, wineryId, argentina, region);
    }

    @AfterEach
    void deleteWine() {
        jdbcTemplate.update("DELETE FROM wines WHERE id = ?", wineId);
        jdbcTemplate.update("DELETE FROM wineries WHERE id IN (?, ?)", wineryId, otherWineryId);
        jdbcTemplate.update("DELETE FROM regions WHERE id = ?", region);
    }

    @Test
    void insertedWineIsIndexedForTextFiltersAndEachGrape() {
        Map<String, Object> row = filterRow();
        assertThat(row).containsEntry("name", "Sincronia Reserva").containsEntry("is_active", true)
                .containsEntry("country_id", argentina).containsEntry("region_id", region)
                .containsEntry("winery_id", wineryId).containsEntry("wine_type", "RED")
                .containsEntry("grapes_text", "[\"Malbec\", \" Cabernet Franc \"]")
                .containsEntry("search_text", "sincronia reserva bodega sincronia");
        assertThat(grapeKeys()).containsExactly("cabernet franc", "malbec");
        assertThat(dictionary()).contains("cabernet franc", "malbec");
        assertThat(publicGrapePage("Cabernet Franc")).containsExactly(wineId);
        assertThat(publicTextPage("sincronia", "Malbec")).containsExactly(wineId);
    }

    @Test
    void grapeChangesReplaceTheGrapeRows() {
        jdbcTemplate.update("UPDATE wines SET grapes = '[\"Syrah\"]' WHERE id = ?", wineId);

        assertThat(grapeKeys()).containsExactly("syrah");
        assertThat(dictionary()).contains("syrah", "malbec");
        assertThat(filterRow()).containsEntry("grapes_text", "[\"Syrah\"]");
        assertThat(publicGrapePage("Malbec")).doesNotContain(wineId);
        assertThat(publicGrapePage("syr")).containsExactly(wineId);
    }

    @Test
    void scalarAndMissingGrapesAreHandled() {
        jdbcTemplate.update("UPDATE wines SET grapes = '\"Torrontés\"' WHERE id = ?", wineId);
        assertThat(grapeKeys()).containsExactly("torrontés");

        jdbcTemplate.update("UPDATE wines SET grapes = NULL WHERE id = ?", wineId);
        assertThat(grapeKeys()).isEmpty();
        assertThat(filterRow()).containsEntry("grapes_text", null);
    }

    @Test
    void attributeChangesAndDeactivationReachBothStructures() {
        jdbcTemplate.update("""
                UPDATE wines SET name = 'Sincronia Gran Reserva', country_id = ?, region_id = NULL,
                                 wine_type = 'WHITE', winery_id = ?
                WHERE id = ?
                """, chile, otherWineryId, wineId);

        assertThat(filterRow()).containsEntry("name", "Sincronia Gran Reserva").containsEntry("country_id", chile)
                .containsEntry("region_id", null).containsEntry("wine_type", "WHITE")
                .containsEntry("winery_id", otherWineryId)
                .containsEntry("search_text", "sincronia gran reserva otra bodega");
        assertThat(jdbcTemplate.queryForList("""
                SELECT DISTINCT name || '|' || country_id || '|' || wine_type || '|' || winery_id
                FROM wine_grape_search WHERE wine_id = ?
                """, String.class, wineId))
                .containsExactly("Sincronia Gran Reserva|" + chile + "|WHITE|" + otherWineryId);

        jdbcTemplate.update("UPDATE wines SET is_active = false WHERE id = ?", wineId);

        assertThat(filterRow()).containsEntry("is_active", false);
        assertThat(jdbcTemplate.queryForList("SELECT DISTINCT is_active FROM wine_grape_search WHERE wine_id = ?",
                Boolean.class, wineId)).containsExactly(false);
        assertThat(publicGrapePage("Malbec")).doesNotContain(wineId);
        assertThat(publicTextPage("sincronia", "Malbec")).doesNotContain(wineId);
        assertThat(wineRepository.searchAdvanced(null, null, null, null, null, "Malbec", PageQuery.of(0, 20), true)
                .content()).extracting(Wine::getId).contains(wineId);
        assertThat(wineRepository.searchAdvanced("sincronia", null, null, "Chile", null, null, PageQuery.of(0, 20),
                true).content()).extracting(Wine::getId).containsExactly(wineId);
    }

    @Test
    void unchangedRewriteKeepsTheRowsAndWineryRenamesReachTheSearchText() {
        jdbcTemplate.update("UPDATE wines SET name = name, grapes = grapes, rating_count = 3 WHERE id = ?", wineId);
        assertThat(grapeKeys()).containsExactly("cabernet franc", "malbec");

        jdbcTemplate.update("UPDATE wineries SET name = 'Bodega Renombrada' WHERE id = ?", wineryId);

        assertThat(filterRow()).containsEntry("search_text", "sincronia reserva bodega renombrada");
        assertThat(publicTextPage("renombrada", "Malbec")).containsExactly(wineId);
    }

    @Test
    void deletedWineLeavesNoSearchRows() {
        jdbcTemplate.update("DELETE FROM wines WHERE id = ?", wineId);

        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM wine_catalog_filter_search WHERE wine_id = ?",
                Long.class, wineId)).isZero();
        assertThat(grapeKeys()).isEmpty();
    }

    private Map<String, Object> filterRow() {
        return jdbcTemplate.queryForMap("""
                SELECT name, is_active, country_id, region_id, winery_id, wine_type, grapes_text, search_text
                FROM wine_catalog_filter_search WHERE wine_id = ?
                """, wineId);
    }

    private List<String> grapeKeys() {
        return jdbcTemplate.queryForList(
                "SELECT grape_key FROM wine_grape_search WHERE wine_id = ? ORDER BY grape_key", String.class, wineId);
    }

    private List<String> dictionary() {
        return jdbcTemplate.queryForList("SELECT grape_key FROM wine_grape_keys", String.class);
    }

    private List<UUID> publicGrapePage(String grape) {
        return wineRepository.searchAdvanced(null, null, null, null, null, grape, PageQuery.of(0, 20), false)
                .content().stream().map(Wine::getId).toList();
    }

    private List<UUID> publicTextPage(String text, String grape) {
        return wineRepository.searchAdvanced(text, null, null, "Argentina", null, grape, PageQuery.of(0, 20), false)
                .content().stream().map(Wine::getId).toList();
    }
}
