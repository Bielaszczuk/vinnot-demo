package com.vinnot.wine.infrastructure.recommendation;

import com.vinnot.wine.application.port.out.TasteAudience;
import com.vinnot.wine.domain.valueobject.TasteAffinity;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.PreparedStatement;
import java.util.List;
import java.util.UUID;

/** One statement over the affinity table; grape names are normalised in SQL exactly as when they were computed. */
@Component
@RequiredArgsConstructor
public class PostgresTasteAudience implements TasteAudience {
    private static final String SQL = """
            SELECT DISTINCT ON (a.user_id) a.user_id, a.kind, a.label FROM user_taste_affinities a
            WHERE a.rated_wines >= ? AND a.score >= ?
                AND ((a.kind = 'GRAPE' AND a.value IN (SELECT lower(trim(g)) FROM unnest(?::text[]) g))
                    OR (a.kind = 'TYPE' AND a.value = ?))
                AND a.user_id IS DISTINCT FROM ?::uuid
                AND NOT EXISTS (SELECT 1 FROM cellar_wines c WHERE c.user_id = a.user_id AND c.wine_id = ?)
                AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.user_id = a.user_id AND r.wine_id = ?)
            ORDER BY a.user_id, (a.kind = 'GRAPE') DESC, a.score DESC, a.rated_wines DESC, a.label
            """;
    private final JdbcTemplate jdbc;

    @Override
    public List<Match> matching(Candidate wine) {
        return jdbc.query(connection -> {
            PreparedStatement statement = connection.prepareStatement(SQL);
            int parameter = 0;
            statement.setInt(++parameter, TasteAffinity.MIN_RATED_WINES);
            statement.setBigDecimal(++parameter, TasteAffinity.MIN_AVERAGE);
            statement.setArray(++parameter, connection.createArrayOf("text", wine.grapes().toArray()));
            statement.setString(++parameter, wine.type().name());
            statement.setObject(++parameter, wine.createdBy());
            statement.setObject(++parameter, wine.wineId());
            statement.setObject(++parameter, wine.wineId());
            return statement;
        }, (row, index) -> new Match(row.getObject("user_id", UUID.class),
                TasteAffinity.Kind.valueOf(row.getString("kind")), row.getString("label")));
    }
}
