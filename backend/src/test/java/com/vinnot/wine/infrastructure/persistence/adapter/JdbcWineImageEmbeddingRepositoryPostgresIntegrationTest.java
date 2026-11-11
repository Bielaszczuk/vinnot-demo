package com.vinnot.wine.infrastructure.persistence.adapter;

import com.vinnot.wine.application.port.out.WineImageEmbeddingRepositoryPort.PendingImage;
import org.junit.jupiter.api.AfterEach;
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

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

@DataJpaTest(properties = {
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.jpa.open-in-view=false"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(JdbcWineImageEmbeddingRepository.class)
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class JdbcWineImageEmbeddingRepositoryPostgresIntegrationTest {

    private static final String MODEL = "gemini-embedding-2";
    private static final UUID CDN = UUID.fromString("00000000-0000-0000-0000-000000000a01");
    private static final UUID UPLOAD = UUID.fromString("00000000-0000-0000-0000-000000000a02");
    private static final UUID EXTERNAL = UUID.fromString("00000000-0000-0000-0000-000000000a03");
    private static final UUID INACTIVE = UUID.fromString("00000000-0000-0000-0000-000000000a04");
    private static final UUID NO_IMAGE = UUID.fromString("00000000-0000-0000-0000-000000000a05");
    private static final Set<UUID> FIXTURES = Set.of(CDN, UPLOAD, EXTERNAL, INACTIVE, NO_IMAGE);
    private static final String CDN_URL = "https://images.vinnot.com/wines/a01.webp";
    private static final String UPLOAD_URL = "/api/uploads/wine-labels/a02.jpg";

    @Container
    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired
    private JdbcWineImageEmbeddingRepository repository;

    @Autowired
    private JdbcTemplate jdbc;

    @AfterEach
    void cleanUp() {
        jdbc.update("DELETE FROM wine_image_embeddings");
        jdbc.update("DELETE FROM wines WHERE id IN (?, ?, ?, ?, ?)", CDN, UPLOAD, EXTERNAL, INACTIVE, NO_IMAGE);
    }

    @Test
    void pendingImagesAreHostedLabelsOfActiveWinesWithoutACurrentVector() {
        insertCatalog();

        assertThat(pending(MODEL, 4, null, 10))
                .containsExactly(new PendingImage(CDN, CDN_URL), new PendingImage(UPLOAD, UPLOAD_URL));
        assertThat(pending(MODEL, 4, CDN, 10)).containsExactly(new PendingImage(UPLOAD, UPLOAD_URL));
        assertThat(pending(MODEL, 4, null, 1)).containsExactly(new PendingImage(CDN, CDN_URL));

        repository.save(CDN, CDN_URL, MODEL, new float[] {1, 0, 0, 0});
        assertThat(pending(MODEL, 4, null, 10)).containsExactly(new PendingImage(UPLOAD, UPLOAD_URL));
    }

    @Test
    void aVectorOfAnotherImageModelOrSizeIsPendingAgain() {
        insertCatalog();
        repository.save(CDN, CDN_URL, MODEL, new float[] {1, 0, 0, 0});
        repository.save(UPLOAD, UPLOAD_URL, MODEL, new float[] {0, 1, 0, 0});

        assertThat(pending("other-model", 4, null, 10)).hasSize(2);
        assertThat(pending(MODEL, 8, null, 10)).hasSize(2);
        jdbc.update("UPDATE wines SET image_url = ? WHERE id = ?", "https://images.vinnot.com/wines/a01-v2.webp", CDN);
        assertThat(pending(MODEL, 4, null, 10))
                .containsExactly(new PendingImage(CDN, "https://images.vinnot.com/wines/a01-v2.webp"));
    }

    @Test
    void savingAgainReplacesTheVectorAndOnlyCurrentVectorsAreStreamed() {
        insertCatalog();
        repository.save(CDN, CDN_URL, MODEL, new float[] {1, 0, 0, 0});
        repository.save(CDN, CDN_URL, MODEL, new float[] {0, 0, 3, 4});
        repository.save(UPLOAD, UPLOAD_URL, "other-model", new float[] {0, 1, 0, 0});
        repository.save(INACTIVE, "https://images.vinnot.com/wines/a04.webp", MODEL, new float[] {0, 1, 0, 0});

        Map<UUID, float[]> streamed = new LinkedHashMap<>();
        repository.forEachVector(MODEL, 4, streamed::put);

        assertThat(streamed).containsOnlyKeys(CDN);
        float[] restored = streamed.get(CDN);
        assertThat(restored[2]).isCloseTo(0.6f, within(0.01f));
        assertThat(restored[3]).isCloseTo(0.8f, within(0.01f));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM wine_image_embeddings WHERE wine_id = ?",
                Integer.class, CDN)).isEqualTo(1);

        jdbc.update("UPDATE wines SET image_url = ? WHERE id = ?", "https://images.vinnot.com/wines/new.webp", CDN);
        streamed.clear();
        repository.forEachVector(MODEL, 4, streamed::put);
        assertThat(streamed).isEmpty();
    }

    @Test
    void deletingAWineDeletesItsVector() {
        insertCatalog();
        repository.save(CDN, CDN_URL, MODEL, new float[] {1, 0, 0, 0});

        jdbc.update("DELETE FROM wines WHERE id = ?", CDN);

        assertThat(jdbc.queryForObject("SELECT count(*) FROM wine_image_embeddings", Integer.class)).isZero();
    }

    @Test
    void thePendingQueryPredicateMatchesThePartialIndex() {
        String predicate = jdbc.queryForObject("""
                SELECT pg_get_expr(i.indpred, i.indrelid) FROM pg_index i
                JOIN pg_class c ON c.oid = i.indexrelid WHERE c.relname = 'idx_wines_hosted_label_image'
                """, String.class);

        assertThat(predicate).contains("'https://images.vinnot.com/%'", "'/api/uploads/wine-labels/%'");
        assertThat(JdbcWineImageEmbeddingRepository.HOSTED_LABEL_IMAGE)
                .contains("'https://images.vinnot.com/%'", "'/api/uploads/wine-labels/%'");
    }

    /** Pending fixture images; Flyway seeds its own wines with uploaded labels after the fixture ids. */
    private List<PendingImage> pending(String model, int dimensions, UUID after, int limit) {
        return repository.findPending(model, dimensions, after, limit).stream()
                .filter(image -> FIXTURES.contains(image.wineId())).toList();
    }

    private void insertCatalog() {
        List.of(new Object[] {CDN, CDN_URL, true}, new Object[] {UPLOAD, UPLOAD_URL, true},
                new Object[] {EXTERNAL, "https://images.vivino.com/thumbs/a03.png", true},
                new Object[] {INACTIVE, "https://images.vinnot.com/wines/a04.webp", false},
                new Object[] {NO_IMAGE, null, true}).forEach(row -> jdbc.update("""
                        INSERT INTO wines (id, name, wine_type, image_url, is_active)
                        VALUES (?, 'Embedding fixture', 'RED', ?, ?)
                        """, row));
    }
}
