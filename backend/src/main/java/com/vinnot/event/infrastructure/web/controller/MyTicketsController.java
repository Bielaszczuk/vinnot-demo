package com.vinnot.event.infrastructure.web.controller;

import com.vinnot.event.application.port.in.GetMyTicketsUseCase;
import com.vinnot.event.application.query.response.EventTicketResponse;
import com.vinnot.shared.domain.valueobject.PageResult;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class MyTicketsController {
    private final GetMyTicketsUseCase tickets;
    @GetMapping("/me/tickets")
    public ResponseEntity<PageResult<EventTicketResponse>> list(@AuthenticationPrincipal String userId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(tickets.list(UUID.fromString(userId),page,size));
    }
    @GetMapping("/me/tickets/{id}")
    public ResponseEntity<EventTicketResponse> get(@AuthenticationPrincipal String userId, @PathVariable UUID id) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(tickets.get(UUID.fromString(userId),id));
    }
}
