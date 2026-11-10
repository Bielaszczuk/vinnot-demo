package com.vinnot.sharing.infrastructure.persistence;

import com.vinnot.sharing.application.port.out.SharedContentQueryPort;
import com.vinnot.sharing.domain.SharedContent;
import com.vinnot.sharing.domain.SharedContentKind;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class JdbcSharedContentQueryAdapter implements SharedContentQueryPort {
    private final JdbcTemplate jdbc;
    @Override
    public Optional<SharedContent> findPublic(SharedContentKind kind, UUID id, boolean english) {
        // Constant statements and a bound UUID: one indexed lookup, no aggregate hydration.
        String sql = switch (kind) {
            case WINES -> "SELECT name AS title, LEFT(COALESCE(NULLIF("
                    + (english ? "description_en, ''), description_es" : "description_es, ''), description_en")
                    + ", ''), 240) AS description, image_url FROM wines WHERE id = ? AND is_active = true";
            case EVENTS -> "SELECT title, LEFT(COALESCE(description, ''), 240) AS description, image_url "
                    + "FROM events WHERE id = ? AND status <> 'DRAFT' "
                    + "AND published_once = true";
            case ROUTES -> "SELECT name AS title, LEFT(COALESCE(description, ''), 240) AS description, image_url "
                    + "FROM wine_routes WHERE id = ? AND status = 'PUBLISHED'";
        };
        return jdbc.query(sql, (row, number) -> new SharedContent(row.getString("title"),
                row.getString("description"), row.getString("image_url")), id).stream().findFirst();
    }
}
