package com.vinnot.community.infrastructure.web;

import com.vinnot.community.application.command.model.AdjustTasteTraitsCommand;
import com.vinnot.community.application.command.model.ResetTasteTraitsCommand;
import com.vinnot.community.application.port.in.AdjustTasteTraitsUseCase;
import com.vinnot.community.application.port.in.ResetTasteTraitsUseCase;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * The signed-in member's manual palate (#541 S11). It lives under {@code /users/me} like the taste quiz, while the
 * community module owns the taste traits these values refine.
 */
@RestController
@RequestMapping("/users/me/taste-traits")
@PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
public class TasteTraitsController {
    private final AdjustTasteTraitsUseCase adjust;
    private final ResetTasteTraitsUseCase reset;

    /**
     * @param structure trait key to a whole score from 0 to 100, or to {@code null} to clear that trait; read as any
     *                  JSON value so that a missing or malformed one fails with {@code INVALID_TASTE_ADJUSTMENT}
     */
    public record TasteTraitsRequest(Object structure) { }

    @PutMapping
    public ResponseEntity<Void> adjust(@AuthenticationPrincipal String principal,
            @RequestBody(required = false) TasteTraitsRequest request) {
        Map<?, ?> structure = Objects.nonNull(request) && request.structure() instanceof Map<?, ?> map ? map : null;
        adjust.execute(new AdjustTasteTraitsCommand(UUID.fromString(principal), structure));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> reset(@AuthenticationPrincipal String principal) {
        reset.execute(new ResetTasteTraitsCommand(UUID.fromString(principal)));
        return ResponseEntity.noContent().build();
    }
}
