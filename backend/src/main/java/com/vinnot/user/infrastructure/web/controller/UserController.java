package com.vinnot.user.infrastructure.web.controller;

import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.shared.infrastructure.web.dto.ApiResponseWrapper;
import com.vinnot.user.application.command.model.ChangePasswordCommand;
import com.vinnot.user.application.command.model.CompleteUserOnboardingCommand;
import com.vinnot.user.application.command.model.DeactivateOwnAccountCommand;
import com.vinnot.user.application.command.model.DeleteOwnAccountCommand;
import com.vinnot.user.application.command.model.RequestEmailChangeCommand;
import com.vinnot.user.application.command.model.UpdateUserPreferencesCommand;
import com.vinnot.user.application.command.model.UpdateUserProfileCommand;
import com.vinnot.user.application.command.model.UploadUserAvatarCommand;
import com.vinnot.user.application.port.in.ChangePasswordUseCase;
import com.vinnot.user.application.port.in.CompleteUserOnboardingUseCase;
import com.vinnot.user.application.port.in.DeactivateOwnAccountUseCase;
import com.vinnot.user.application.port.in.DeleteOwnAccountUseCase;
import com.vinnot.user.application.port.in.GetPublicUserProfileUseCase;
import com.vinnot.user.application.port.in.GetUserByIdUseCase;
import com.vinnot.user.application.port.in.GetUserStatsUseCase;
import com.vinnot.user.application.port.in.RequestEmailChangeUseCase;
import com.vinnot.user.application.port.in.SearchUsersUseCase;
import com.vinnot.user.application.port.in.UpdateUserPreferencesUseCase;
import com.vinnot.user.application.port.in.UpdateUserProfileUseCase;
import com.vinnot.user.application.port.in.UploadUserAvatarUseCase;
import com.vinnot.user.application.query.model.GetPublicUserProfileQuery;
import com.vinnot.user.application.query.model.GetUserByIdQuery;
import com.vinnot.user.application.query.model.GetUserStatsQuery;
import com.vinnot.user.application.query.model.SearchUsersQuery;
import com.vinnot.user.application.query.response.PublicUserProfileResponse;
import com.vinnot.user.application.query.response.UserResponse;
import com.vinnot.user.application.query.response.UserStatsResponse;
import com.vinnot.user.infrastructure.web.request.ChangePasswordRequest;
import com.vinnot.user.infrastructure.web.request.CompleteOnboardingRequest;
import com.vinnot.user.infrastructure.web.request.DeleteOwnAccountRequest;
import com.vinnot.user.infrastructure.web.request.RequestEmailChangeRequest;
import com.vinnot.user.infrastructure.web.request.UpdatePreferencesRequest;
import com.vinnot.user.infrastructure.web.request.UpdateProfileRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import com.vinnot.community.application.port.in.CheckCommunityProfileUseCase;

@RestController
@RequestMapping("/users")
@Tag(name = "Users", description = "User profile and account management endpoints")
@RequiredArgsConstructor
public class UserController {

    private final CheckCommunityProfileUseCase communityProfileAccess;
    private final GetUserStatsUseCase getUserStatsUseCase;
    private final GetUserByIdUseCase getUserByIdUseCase;
    private final GetPublicUserProfileUseCase getPublicUserProfileUseCase;
    private final UpdateUserProfileUseCase updateUserProfileUseCase;
    private final UpdateUserPreferencesUseCase updateUserPreferencesUseCase;
    private final CompleteUserOnboardingUseCase completeUserOnboardingUseCase;
    private final DeactivateOwnAccountUseCase deactivateOwnAccountUseCase;
    private final DeleteOwnAccountUseCase deleteOwnAccountUseCase;
    private final ChangePasswordUseCase changePasswordUseCase;
    private final SearchUsersUseCase searchUsersUseCase;
    private final RequestEmailChangeUseCase requestEmailChangeUseCase;
    private final UploadUserAvatarUseCase uploadUserAvatarUseCase;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "List users (admin)")
    public ResponseEntity<PageResult<UserResponse>> listUsers(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(searchUsersUseCase.execute(
                new SearchUsersQuery(search, page, size)));
    }

    @GetMapping("/{userId}/stats")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get user statistics (admin)")
    public ResponseEntity<ApiResponseWrapper<UserStatsResponse>> getStats(
            @PathVariable UUID userId) {
        return ResponseEntity.ok(ApiResponseWrapper.of(
                getUserStatsUseCase.execute(new GetUserStatsQuery(userId))));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get user by ID (admin)")
    public ResponseEntity<ApiResponseWrapper<UserResponse>> getUser(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponseWrapper.of(
                getUserByIdUseCase.execute(new GetUserByIdQuery(id))));
    }

    @GetMapping("/me/stats")
    @Operation(summary = "Get current user statistics")
    public ResponseEntity<ApiResponseWrapper<UserStatsResponse>> getMyStats(
            @AuthenticationPrincipal String principal) {
        UserStatsResponse response = getUserStatsUseCase.execute(
                new GetUserStatsQuery(userId(principal)));
        return ResponseEntity.ok(ApiResponseWrapper.of(response));
    }

    @PatchMapping("/me")
    @Operation(summary = "Update current user profile")
    public ResponseEntity<ApiResponseWrapper<UserResponse>> updateMe(
            @AuthenticationPrincipal String principal,
            @Valid @RequestBody UpdateProfileRequest request) {
        UUID userId = userId(principal);
        updateUserProfileUseCase.execute(new UpdateUserProfileCommand(
                userId,
                request.username(),
                request.firstName(),
                request.lastName(),
                request.name(),
                request.phoneNumber(),
                request.bio(),
                request.cellarVisibility()));
        return ResponseEntity.ok(ApiResponseWrapper.of(
                getUserByIdUseCase.execute(new GetUserByIdQuery(userId))));
    }

    @PatchMapping("/me/preferences")
    @Operation(summary = "Update current user's language and time zone")
    public ResponseEntity<ApiResponseWrapper<UserResponse>> updateMyPreferences(
            @AuthenticationPrincipal String principal,
            @Valid @RequestBody UpdatePreferencesRequest request) {
        UUID userId = userId(principal);
        updateUserPreferencesUseCase.execute(new UpdateUserPreferencesCommand(
                userId, request.preferredLanguage(), request.timezone()));
        return ResponseEntity.ok(ApiResponseWrapper.of(
                getUserByIdUseCase.execute(new GetUserByIdQuery(userId))));
    }

    @PostMapping("/me/onboarding")
    @Operation(summary = "Complete or skip current user's initial profile setup")
    public ResponseEntity<ApiResponseWrapper<UserResponse>> completeOnboarding(
            @AuthenticationPrincipal String principal,
            @Valid @RequestBody CompleteOnboardingRequest request) {
        UUID userId = userId(principal);
        completeUserOnboardingUseCase.execute(
                new CompleteUserOnboardingCommand(userId, request.username()));
        return ResponseEntity.ok(ApiResponseWrapper.of(
                getUserByIdUseCase.execute(new GetUserByIdQuery(userId))));
    }

    @PostMapping("/me/avatar")
    @Operation(summary = "Upload current user's avatar image")
    public ResponseEntity<ApiResponseWrapper<Map<String, String>>> uploadAvatar(
            @AuthenticationPrincipal String principal,
            @RequestParam("file") MultipartFile file) {
        try {
            String avatarUrl = uploadUserAvatarUseCase.execute(new UploadUserAvatarCommand(
                    userId(principal),
                    file.getInputStream(),
                    file.getOriginalFilename(),
                    file.getContentType(),
                    file.getSize()));
            return ResponseEntity.ok(ApiResponseWrapper.of(Map.of("avatarUrl", avatarUrl)));
        } catch (IOException exception) {
            throw new IllegalArgumentException("Failed to read uploaded file", exception);
        }
    }

    @PostMapping("/me/change-password")
    @Operation(summary = "Change current user's password")
    public ResponseEntity<Map<String, String>> changePassword(
            @AuthenticationPrincipal String principal,
            @Valid @RequestBody ChangePasswordRequest request) {
        changePasswordUseCase.execute(new ChangePasswordCommand(
                userId(principal), request.currentPassword(), request.newPassword()));
        return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
    }

    @PostMapping("/me/email-change")
    @Operation(summary = "Request a verified email change")
    public ResponseEntity<Map<String, String>> requestEmailChange(
            @AuthenticationPrincipal String principal,
            @Valid @RequestBody RequestEmailChangeRequest request) {
        requestEmailChangeUseCase.execute(new RequestEmailChangeCommand(
                userId(principal), request.newEmail()));
        return ResponseEntity.ok(Map.of(
                "message", "A confirmation link has been sent to the new email address"));
    }

    @GetMapping("/{id}/profile")
    @Operation(summary = "Get a user's public profile")
    public ResponseEntity<ApiResponseWrapper<PublicUserProfileResponse>> getUserProfile(
            @PathVariable UUID id, @AuthenticationPrincipal String principal) {
        UUID viewer = Objects.isNull(principal) || "anonymousUser".equals(principal) ? null : UUID.fromString(principal);
        communityProfileAccess.execute(viewer, id);
        return ResponseEntity.ok(ApiResponseWrapper.of(
                getPublicUserProfileUseCase.execute(new GetPublicUserProfileQuery(viewer, id))));
    }

    @DeleteMapping("/me")
    @Operation(summary = "Deactivate current user's account")
    public ResponseEntity<Void> deactivateAccount(
            @AuthenticationPrincipal String principal) {
        deactivateOwnAccountUseCase.execute(new DeactivateOwnAccountCommand(userId(principal)));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/me/permanent")
    @Operation(summary = "Permanently delete current user's account")
    public ResponseEntity<Void> deleteAccount(
            @AuthenticationPrincipal String principal,
            @Valid @RequestBody(required = false) DeleteOwnAccountRequest request) {
        deleteOwnAccountUseCase.execute(new DeleteOwnAccountCommand(
                userId(principal),
                Objects.nonNull(request) ? request.appleAuthorizationCode() : null,
                Objects.nonNull(request) ? request.appleClientId() : null,
                Objects.nonNull(request) ? request.appleRedirectUri() : null));
        return ResponseEntity.noContent().build();
    }

    private UUID userId(String principal) {
        return UUID.fromString(principal);
    }
}
