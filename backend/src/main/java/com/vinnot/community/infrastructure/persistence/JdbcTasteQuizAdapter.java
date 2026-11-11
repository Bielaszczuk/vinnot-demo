package com.vinnot.community.infrastructure.persistence;

import com.vinnot.community.application.port.out.TasteQuizRepositoryPort;
import com.vinnot.community.domain.model.TasteQuiz;
import com.vinnot.community.domain.model.TasteQuizStatus;

import lombok.RequiredArgsConstructor;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/** The taste quiz table: answers are a jsonb object of question key to option key, null when skipped. */
@Repository
@RequiredArgsConstructor
public class JdbcTasteQuizAdapter implements TasteQuizRepositoryPort {
    private static final TypeReference<Map<String, String>> ANSWERS = new TypeReference<>() { };
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    @Override
    public Optional<StoredTasteQuiz> find(UUID userId) {
        return jdbc.query("SELECT status, answers::text AS answers FROM user_taste_quiz WHERE user_id=?",
                (row, index) -> {
                    String answers = row.getString("answers");
                    return new StoredTasteQuiz(TasteQuizStatus.valueOf(row.getString("status")),
                            Objects.isNull(answers) ? null : TasteQuiz.of(json.readValue(answers, ANSWERS)));
                }, userId).stream().findFirst();
    }

    @Override
    public void saveCompleted(UUID userId, TasteQuiz quiz) {
        jdbc.update("""
                INSERT INTO user_taste_quiz(user_id,status,answers,updated_at) VALUES (?,'COMPLETED',?::jsonb,now())
                ON CONFLICT (user_id) DO UPDATE SET status='COMPLETED', answers=EXCLUDED.answers, updated_at=now()
                """, userId, json.writeValueAsString(quiz.keys()));
    }

    @Override
    public void skipIfAbsent(UUID userId) {
        jdbc.update("INSERT INTO user_taste_quiz(user_id,status) VALUES (?,'SKIPPED') ON CONFLICT (user_id) DO NOTHING",
                userId);
    }
}
