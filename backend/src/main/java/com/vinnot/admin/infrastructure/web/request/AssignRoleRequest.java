package com.vinnot.admin.infrastructure.web.request;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AssignRoleRequest(
        @NotBlank @Size(max = 50) String role
) {
}
