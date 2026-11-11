package com.vinnot.community.infrastructure.web;

import com.vinnot.community.application.port.in.GetSocialUseCase;
import com.vinnot.community.application.query.response.PublicCellarWineResponse;
import com.vinnot.community.application.query.response.UserReviewResponse;
import com.vinnot.shared.domain.valueobject.PageResult;

import lombok.RequiredArgsConstructor;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** A member's public activity on their profile (#541): approved reviews and the cellar their setting allows. */
@RestController
@RequestMapping("/users")
@PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
public class MemberActivityController {
    private final GetSocialUseCase social;

    @GetMapping("/{userId}/reviews")
    public PageResult<UserReviewResponse> reviews(
            @AuthenticationPrincipal String principal,
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return social.reviews(UUID.fromString(principal), userId, page, size);
    }

    @GetMapping("/{userId}/cellar")
    public PageResult<PublicCellarWineResponse> cellar(
            @AuthenticationPrincipal String principal,
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return social.cellar(UUID.fromString(principal), userId, page, size);
    }
}
