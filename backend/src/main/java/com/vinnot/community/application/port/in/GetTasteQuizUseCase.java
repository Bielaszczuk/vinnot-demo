package com.vinnot.community.application.port.in;

import com.vinnot.community.application.query.response.TasteQuizResponse;

import java.util.UUID;

/** The member's own taste quiz status and answers (#541). */
public interface GetTasteQuizUseCase {
    TasteQuizResponse execute(UUID userId);
}
