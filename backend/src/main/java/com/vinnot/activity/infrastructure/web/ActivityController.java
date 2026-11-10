package com.vinnot.activity.infrastructure.web;

import com.vinnot.activity.application.command.model.RecordAppOpenCommand;
import com.vinnot.activity.application.command.model.RecordContentViewCommand;
import com.vinnot.activity.application.port.in.RecordAppOpenUseCase;
import com.vinnot.activity.application.port.in.RecordContentViewUseCase;
import com.vinnot.activity.domain.model.ContentKind;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Engagement signals the apps send for personalised suggestions and send times (#405). */
@RestController
@RequestMapping("/users/me/activity")
@Tag(name = "Activity")
public class ActivityController {
    private final RecordContentViewUseCase views;
    private final RecordAppOpenUseCase opens;

    public ActivityController(RecordContentViewUseCase views, RecordAppOpenUseCase opens) {
        this.views = views;
        this.opens = opens;
    }

    @PostMapping("/views")
    @Operation(summary = "Record that the current user opened a wine, route, event or winery detail")
    public ResponseEntity<Void> view(@AuthenticationPrincipal String principal, @Valid @RequestBody ViewRequest request) {
        views.execute(new RecordContentViewCommand(UUID.fromString(principal), ContentKind.valueOf(request.kind()),
                request.id()));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/app-open")
    @Operation(summary = "Record that the current user opened the app; at most one open per 30 minutes is kept")
    public ResponseEntity<Void> appOpen(@AuthenticationPrincipal String principal) {
        opens.execute(new RecordAppOpenCommand(UUID.fromString(principal)));
        return ResponseEntity.noContent().build();
    }

    public record ViewRequest(@NotNull @Pattern(regexp = "WINE|ROUTE|EVENT|WINERY") String kind, @NotNull UUID id) {
    }
}
