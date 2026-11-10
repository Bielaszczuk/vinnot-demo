package com.vinnot.wine.infrastructure.persistence;

import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.infrastructure.persistence.adapter.AccountDeletionIntegrity;
import com.vinnot.user.infrastructure.persistence.adapter.UserPersistenceAdapter;
import com.vinnot.wine.application.port.out.WineSubmissionAuthorQueryPort;
import com.vinnot.wine.infrastructure.persistence.adapter.WineSubmissionAuthorQueryAdapter;
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
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(properties = {
        "spring.flyway.enabled=true", "spring.jpa.hibernate.ddl-auto=validate",
        "spring.jpa.open-in-view=false", "spring.jpa.properties.hibernate.generate_statistics=true"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({UserPersistenceAdapter.class, WineSubmissionAuthorQueryAdapter.class})
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class WineSubmissionAuthorsPostgresIntegrationTest {
    @Container
    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    @Autowired JdbcTemplate jdbc;
    @Autowired WineSubmissionAuthorQueryPort authors;
    @Autowired UserRepositoryPort users;
    @Autowired EntityManagerFactory entityManagerFactory;
    @MockitoBean AccountDeletionIntegrity deletionIntegrity;

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Test
    void loadsOnlyRequestedNamesWithoutHydratingUsersOrRoles() {
        UUID first = insert("first.author");
        UUID second = insert("second.author");
        insert("unrelated.author");
        var stats = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        stats.clear();
        var result = authors.findAllByIds(List.of(first, second, UUID.randomUUID()));
        assertThat(result).containsExactlyInAnyOrder(
                new WineSubmissionAuthorQueryPort.Author(first, "first.author"),
                new WineSubmissionAuthorQueryPort.Author(second, "second.author"));
        assertThat(stats.getPrepareStatementCount()).isEqualTo(1);
        assertThat(stats.getEntityLoadCount()).isZero();
        assertThat(stats.getCollectionLoadCount()).isZero();
        assertThat(users.findUsernamesByIds(List.of())).isEmpty();
        assertThat(stats.getPrepareStatementCount()).isEqualTo(1);
    }

    private UUID insert(String username) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO users(id,username,email,password,first_name,last_name)
                VALUES (?,?,?,'unused-fixture-hash','Test','Author')
                """, id, username, username + "@example.invalid");
        return id;
    }
}
