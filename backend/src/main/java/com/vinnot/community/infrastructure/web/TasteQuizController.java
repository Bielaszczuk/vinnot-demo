package com.vinnot.community.infrastructure.web;

import com.vinnot.community.application.command.model.CompleteTasteQuizCommand;
import com.vinnot.community.application.command.model.SkipTasteQuizCommand;
import com.vinnot.community.application.port.in.CompleteTasteQuizUseCase;
import com.vinnot.community.application.port.in.GetTasteQuizUseCase;
import com.vinnot.community.application.port.in.SkipTasteQuizUseCase;
import com.vinnot.community.application.query.response.TasteQuizResponse;
import com.vinnot.shared.infrastructure.web.dto.ApiResponseWrapper;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * The signed-in member's own taste quiz (#541). It lives under {@code /users/me} like the rest of the own account,
 * while the community module owns the quiz next to the taste traits it seeds. Reads use the {@code {data}} wrapper of
 * the other {@code /users/me} reads.
 */
@RestController
@RequestMapping("/users/me/taste-quiz")
@PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
public class TasteQuizController {
    private final GetTasteQuizUseCase getQuiz;
    private final CompleteTasteQuizUseCase completeQuiz;
    private final SkipTasteQuizUseCase skipQuiz;

    /** @param answers question key to option key, one for each of the five questions */
    public record TasteQuizRequest(Map<String, String> answers) { }

    @GetMapping
    public ApiResponseWrapper<TasteQuizResponse> quiz(@AuthenticationPrincipal String principal) {
        return ApiResponseWrapper.of(getQuiz.execute(UUID.fromString(principal)));
    }

    @PutMapping
    public ResponseEntity<Void> complete(@AuthenticationPrincipal String principal,
            @RequestBody(required = false) TasteQuizRequest request) {
        completeQuiz.execute(new CompleteTasteQuizCommand(UUID.fromString(principal),
                Objects.isNull(request) ? null : request.answers()));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/skip")
    public ResponseEntity<Void> skip(@AuthenticationPrincipal String principal) {
        skipQuiz.execute(new SkipTasteQuizCommand(UUID.fromString(principal)));
        return ResponseEntity.noContent().build();
    }
}
