package com.vinnot.community.infrastructure.persistence;

import com.vinnot.community.application.port.out.TasteAdjustmentRepositoryPort;
import com.vinnot.community.domain.model.TasteAdjustment;
import com.vinnot.community.domain.model.TasteTrait;

import lombok.RequiredArgsConstructor;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.EnumMap;
import java.util.Map;
import java.util.UUID;

/** The manual palate table: one smallint score per member and trait. */
@Repository
@RequiredArgsConstructor
public class JdbcTasteAdjustmentAdapter implements TasteAdjustmentRepositoryPort {
    private final JdbcTemplate jdbc;

    @Override
    public Map<TasteTrait, Integer> find(UUID userId) {
        Map<TasteTrait, Integer> scores = new EnumMap<>(TasteTrait.class);
        jdbc.query("SELECT trait, score FROM user_taste_adjustments WHERE user_id=?",
                row -> {
                    scores.put(TasteTrait.valueOf(row.getString("trait")), row.getInt("score"));
                }, userId);
        return scores;
    }

    @Override
    public void save(UUID userId, TasteAdjustment adjustment) {
        adjustment.scores().forEach((trait, score) -> jdbc.update("""
                INSERT INTO user_taste_adjustments(user_id,trait,score,updated_at) VALUES (?,?,?,now())
                ON CONFLICT (user_id, trait) DO UPDATE SET score=EXCLUDED.score, updated_at=now()
                """, userId, trait.name(), score));
        adjustment.cleared().forEach(trait -> jdbc.update(
                "DELETE FROM user_taste_adjustments WHERE user_id=? AND trait=?", userId, trait.name()));
    }

    @Override
    public void clear(UUID userId) {
        jdbc.update("DELETE FROM user_taste_adjustments WHERE user_id=?", userId);
    }
}
