package com.vinnot.admin.infrastructure.web.controller;

import com.vinnot.admin.application.port.in.GetAdminUserByIdUseCase;
import com.vinnot.admin.application.port.in.SearchAdminUsersUseCase;
import com.vinnot.admin.application.query.model.GetAdminUserByIdQuery;
import com.vinnot.admin.application.query.model.SearchAdminUsersQuery;
import com.vinnot.admin.application.query.response.UserAdminResponse;
import com.vinnot.admin.infrastructure.web.request.AssignRoleRequest;
import com.vinnot.admin.infrastructure.web.request.BanUserRequest;
import com.vinnot.admin.infrastructure.web.request.UpdateUserAdminRequest;
import com.vinnot.user.application.command.model.AssignRoleCommand;
import com.vinnot.user.application.command.model.BanUserCommand;
import com.vinnot.user.application.command.model.DeleteUserAdminCommand;
import com.vinnot.user.application.command.model.UnbanUserCommand;
import com.vinnot.user.application.command.model.UpdateUserAdminCommand;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.user.domain.valueobject.SuspensionReason;
import com.vinnot.user.application.port.in.AssignRoleUseCase;
import com.vinnot.user.application.port.in.BanUserUseCase;
import com.vinnot.user.application.port.in.DeleteUserAdminUseCase;
import com.vinnot.user.application.port.in.UnbanUserUseCase;
import com.vinnot.user.application.port.in.UpdateUserAdminUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import com.vinnot.shared.domain.valueobject.PageResult;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;
import java.util.Locale;
import java.util.Objects;
import com.vinnot.shared.infrastructure.web.dto.MutationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PutMapping;

@RestController
@RequestMapping("/admin/users")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin - Users", description = "Admin user management endpoints")
@RequiredArgsConstructor
public class UserAdminController {

    private final SearchAdminUsersUseCase searchUseCase;
    private final GetAdminUserByIdUseCase getByIdUseCase;
    private final UpdateUserAdminUseCase updateUseCase;
    private final BanUserUseCase banUseCase;
    private final UnbanUserUseCase unbanUseCase;
    private final AssignRoleUseCase assignRoleUseCase;
    private final DeleteUserAdminUseCase deleteUseCase;

    @GetMapping
    @Operation(summary = "List all users (admin)")
    public ResponseEntity<PageResult<UserAdminResponse>> list(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        PageResult<UserAdminResponse> response = searchUseCase.execute(
                new SearchAdminUsersQuery(search, page, size));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get user by ID (admin)")
    public ResponseEntity<UserAdminResponse> getById(@PathVariable UUID id) {
        UserAdminResponse response = getByIdUseCase.execute(new GetAdminUserByIdQuery(id));
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Update user (admin)")
    public ResponseEntity<Void> update(@PathVariable UUID id,
            @AuthenticationPrincipal String principal,
            @RequestBody UpdateUserAdminRequest request) {
        updateUseCase.execute(new UpdateUserAdminCommand(
                id, request.firstName(), request.lastName(), request.active(), UUID.fromString(principal)));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/assign-role")
    @Operation(summary = "Assign role to user (admin)")
    public ResponseEntity<MutationResponse> assignRole(
            @PathVariable UUID id,
            @AuthenticationPrincipal String principal,
            @Valid @RequestBody AssignRoleRequest request) {
        assignRoleUseCase.execute(new AssignRoleCommand(id, request.role(), UUID.fromString(principal), false));
        return ResponseEntity.ok(MutationResponse.message("Role assigned successfully"));
    }

    @PutMapping("/{id}/role")
    @Operation(summary = "Replace the user's functional role while retaining baseline USER access")
    public ResponseEntity<MutationResponse> replaceRole(
            @PathVariable UUID id,
            @AuthenticationPrincipal String principal,
            @Valid @RequestBody AssignRoleRequest request) {
        assignRoleUseCase.execute(new AssignRoleCommand(id, request.role(), UUID.fromString(principal), true));
        return ResponseEntity.ok(MutationResponse.message("Role updated successfully"));
    }

    @PostMapping("/{id}/ban")
    @Operation(summary = "Ban user (admin)")
    public ResponseEntity<MutationResponse> ban(
            @PathVariable UUID id,
            @AuthenticationPrincipal String principal,
            @Valid @RequestBody(required = false) BanUserRequest request) {
        String reason = Objects.nonNull(request) ? request.reason() : null;
        SuspensionReason code = Objects.nonNull(request) ? suspensionReason(request.reasonCode()) : null;
        banUseCase.execute(new BanUserCommand(id, code, reason, UUID.fromString(principal)));
        return ResponseEntity.ok(MutationResponse.message("User banned"));
    }

    @PostMapping("/{id}/unban")
    @Operation(summary = "Unban user (admin)")
    public ResponseEntity<MutationResponse> unban(@PathVariable UUID id) {
        unbanUseCase.execute(new UnbanUserCommand(id));
        return ResponseEntity.ok(MutationResponse.message("User unbanned"));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete user (admin)")
    public ResponseEntity<MutationResponse> delete(@PathVariable UUID id,
            @AuthenticationPrincipal String principal) {
        deleteUseCase.execute(new DeleteUserAdminCommand(id, UUID.fromString(principal)));
        return ResponseEntity.ok(MutationResponse.of(id, "User deleted successfully"));
    }

    private static SuspensionReason suspensionReason(String code) {
        if (Objects.isNull(code) || code.isBlank()) {
            return null;
        }
        try {
            return SuspensionReason.valueOf(code.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException unknown) {
            throw new DomainException("INVALID_SUSPENSION_REASON", "Unknown suspension reason");
        }
    }
}
