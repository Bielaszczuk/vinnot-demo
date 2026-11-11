package com.vinnot.community.application.port.out;

import com.vinnot.community.domain.model.TasteQuiz;
import com.vinnot.community.domain.model.TasteQuizStatus;

import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/** Each member's taste quiz (#541): one row per member, completed with answers or skipped without them. */
public interface TasteQuizRepositoryPort {
    /** The member's stored quiz; empty while they neither completed nor skipped it. */
    Optional<StoredTasteQuiz> find(UUID userId);

    /** Stores the quiz as completed; a retake overwrites the previous answers, and a skip becomes completed. */
    void saveCompleted(UUID userId, TasteQuiz quiz);

    /** Records a skip only when the member has no quiz yet; a completed or skipped quiz stays as it is. */
    void skipIfAbsent(UUID userId);

    /**
     * @param status COMPLETED or SKIPPED
     * @param quiz   the answers when completed, {@code null} when skipped
     */
    record StoredTasteQuiz(TasteQuizStatus status, TasteQuiz quiz) {
        public StoredTasteQuiz {
            Objects.requireNonNull(status, "status");
        }

        /** The answers of a completed quiz; empty for a skipped one. */
        public Optional<TasteQuiz> completed() {
            return status == TasteQuizStatus.COMPLETED ? Optional.ofNullable(quiz) : Optional.empty();
        }
    }
}
