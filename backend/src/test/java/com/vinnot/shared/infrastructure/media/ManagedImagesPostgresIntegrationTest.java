package com.vinnot.shared.infrastructure.media;

import com.vinnot.shared.application.media.CoverImageUseCase;
import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import com.vinnot.shared.domain.valueobject.ResourceReader;
import com.vinnot.shared.infrastructure.storage.R2OperationBudget;
import com.vinnot.shared.infrastructure.storage.StorageCleanupEffectHandler;
import com.vinnot.shared.application.port.FileStoragePort;
import com.vinnot.shared.infrastructure.effects.DurableEffectQueue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.ArrayList;
import java.util.concurrent.atomic.AtomicInteger;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@DataJpaTest(properties = {"spring.flyway.enabled=true", "spring.jpa.hibernate.ddl-auto=validate",
        "app.storage.provider=local", "app.storage.r2.max-reserved-bytes=100", "app.storage.r2.max-monthly-writes=10"})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({JdbcCoverImageRegistry.class, R2OperationBudget.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class ManagedImagesPostgresIntegrationTest {
    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    @Autowired JdbcTemplate jdbc;
    @Autowired JdbcCoverImageRegistry registry;
    @Autowired R2OperationBudget budget;
    @Autowired PlatformTransactionManager transactions;
    @MockitoBean DurableEffectQueue effects;

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry values) {
        values.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        values.add("spring.datasource.username", POSTGRES::getUsername);
        values.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @BeforeEach
    void clear() { jdbc.execute("TRUNCATE managed_cover_images, storage_operation_budgets"); }

    @Test
    void concurrentWritesStopAtTheBudgetAndReservationsSurviveOuterRollback() throws Exception {
        var accepted = new AtomicInteger();
        try (var executor = Executors.newFixedThreadPool(10)) {
            var calls = new ArrayList<Future<?>>();
            for (int i = 0; i < 20; i++) {
                calls.add(executor.submit(() -> {
                    try { budget.reserveWrite(10);
                        accepted.incrementAndGet(); }
                    catch (ExternalServiceUnavailableException exhausted) { /* rejected before I/O */ }
                }));
            }
            for (var call : calls) { call.get(); }
        }
        assertThat(accepted.get()).isEqualTo(10);
        assertThat(jdbc.queryForObject("SELECT bytes_reserved FROM storage_operation_budgets WHERE scope='r2-storage'", Long.class)).isEqualTo(100L);
        jdbc.execute("TRUNCATE storage_operation_budgets");
        var tx = new TransactionTemplate(transactions);
        tx.executeWithoutResult(status -> { budget.reserveWrite(20);
            status.setRollbackOnly(); });
        assertThat(jdbc.queryForObject("SELECT bytes_reserved FROM storage_operation_budgets WHERE scope='r2-storage'", Long.class)).isEqualTo(20L);
    }

    @Test
    void draftsOwnersPublicationsWrongKindsAndCleanupKeepTheSameVisibilityRules() {
        UUID owner = UUID.randomUUID();
        UUID image = UUID.randomUUID();
        String url = "/api/uploads/covers/" + image + ".webp";
        registry.stage(image, owner, CoverImageUseCase.Kind.EVENT, url);
        assertThat(registry.permitsRead(image, new ResourceReader(owner, false))).isFalse();
        registry.markReady(image);
        assertThat(registry.permitsRead(image, new ResourceReader(owner, false))).isTrue();
        assertThat(registry.permitsRead(image, ResourceReader.anonymous())).isFalse();
        assertThat(registry.permitsAttachment(image, CoverImageUseCase.Kind.WINE_ROUTE, ResourceReader.staff())).isFalse();
        assertThat(registry.permitsAttachment(image, CoverImageUseCase.Kind.EVENT, new ResourceReader(UUID.randomUUID(), false))).isFalse();
        assertThat(registry.permitsAttachment(image, CoverImageUseCase.Kind.EVENT, new ResourceReader(owner, false))).isTrue();
        jdbc.update("INSERT INTO users(id,email,password,first_name,last_name,username) VALUES (?, ?, 'test', 'Test', 'Image', ?)", owner, owner + "@example.test", owner.toString());
        UUID event = UUID.randomUUID();
        jdbc.update("INSERT INTO events(id,title,event_type,start_date,end_date,organizer_id,image_url) VALUES (?, 'test', 'TASTING', now(), now(), ?, ?)", event, owner, url);
        assertThat(registry.permitsRead(image, ResourceReader.anonymous())).isFalse();
        jdbc.update("UPDATE events SET status='PUBLISHED', published_once=true WHERE id=?", event);
        assertThat(registry.permitsRead(image, ResourceReader.anonymous())).isTrue();
        jdbc.update("UPDATE events SET status='DRAFT' WHERE id=?", event);
        assertThat(registry.permitsRead(image, ResourceReader.anonymous())).isFalse();
        FileStoragePort storage = mock(FileStoragePort.class);
        var cleanup = new StorageCleanupEffectHandler(storage, jdbc);
        jdbc.update("UPDATE managed_cover_images SET created_at=now()-interval '3 hours' WHERE id=?", image);
        new TransactionTemplate(transactions).executeWithoutResult(status -> cleanup.execute("cover-cleanup", Map.of("owner", image.toString())));
        verifyNoInteractions(storage);
        jdbc.update("DELETE FROM users WHERE id=?", owner);
        new TransactionTemplate(transactions).executeWithoutResult(status -> cleanup.execute("cover-cleanup", Map.of("owner", image.toString())));
        verify(storage).deleteCover(image);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM managed_cover_images", Long.class)).isZero();
    }

    @Test
    void dailyUploadQuotaIsSharedAcrossInstances() {
        UUID owner = UUID.randomUUID();
        for (int i = 0; i < 20; i++) {
            UUID id = UUID.randomUUID();
            registry.stage(id, owner, CoverImageUseCase.Kind.WINE_ROUTE, "/api/uploads/covers/" + id + ".webp");
        }
        UUID rejected = UUID.randomUUID();
        assertThatThrownBy(() -> registry.stage(rejected, owner, CoverImageUseCase.Kind.EVENT, "/api/uploads/covers/" + rejected + ".webp"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("limit");
    }
}
