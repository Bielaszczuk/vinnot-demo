package com.vinnot.review.infrastructure.persistence.adapter;

import com.vinnot.review.domain.model.Review;
import com.vinnot.review.infrastructure.persistence.mapper.ReviewPersistenceMapperImpl;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
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

/** The admin reviews search matches the title, the comment, the author username and the wine name. */
@DataJpaTest(properties = {"spring.flyway.enabled=true", "spring.jpa.hibernate.ddl-auto=validate",
        "spring.jpa.open-in-view=false"})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({ReviewPersistenceAdapter.class, ReviewPersistenceMapperImpl.class})
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class AdminReviewSearchPostgresIntegrationTest {
    @Container
    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    private static final PageQuery FIRST_PAGE = PageQuery.of(0, 20);

    @Autowired JdbcTemplate jdbc;
    @Autowired ReviewPersistenceAdapter reviews;

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @BeforeEach
    void reviews() {
        UUID malbec = wine("Gran Malbec");
        UUID torrontes = wine("Pircas Negras Torrontés");
        UUID sommelier = user("sommelier_ana");
        UUID bruno = user("bruno_cata");
        review(malbec, sommelier, "Muy frutado", "Ideal para asado");
        review(torrontes, bruno, "Floral", "Fresco y aromático");
    }

    @Test
    void matchesTheAuthorUsernameIgnoringCase() {
        assertThat(titles(reviews.searchByKeyword("SOMMELIER", FIRST_PAGE))).containsExactly("Muy frutado");
    }

    @Test
    void matchesTheWineNameIgnoringCase() {
        PageResult<Review> page = reviews.searchByKeyword("pircas", FIRST_PAGE);

        assertThat(titles(page)).containsExactly("Floral");
        assertThat(page.totalElements()).isEqualTo(1);
    }

    @Test
    void stillMatchesTheTitleAndTheComment() {
        assertThat(titles(reviews.searchByKeyword("frutado", FIRST_PAGE))).containsExactly("Muy frutado");
        assertThat(titles(reviews.searchByKeyword("AROMÁTICO", FIRST_PAGE))).containsExactly("Floral");
        assertThat(titles(reviews.searchByKeyword("rioja", FIRST_PAGE))).isEmpty();
    }

    private static List<String> titles(PageResult<Review> page) {
        return page.content().stream().map(Review::getTitle).toList();
    }

    private UUID wine(String name) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO wines(id,name,wine_type,is_active) VALUES (?,?,'RED',true)", id, name);
        return id;
    }

    private UUID user(String username) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO users(id,username,email,password,first_name,last_name,active)
                VALUES (?,?,?,'fixture','Review','Author',true)
                """, id, username, id + "@example.invalid");
        return id;
    }

    private void review(UUID wine, UUID author, String title, String comment) {
        jdbc.update("""
                INSERT INTO reviews(id,wine_id,user_id,rating,title,comment,publication_status)
                VALUES (?,?,?,4,?,?,'APPROVED')
                """, UUID.randomUUID(), wine, author, title, comment);
    }
}
