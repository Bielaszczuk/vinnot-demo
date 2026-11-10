package com.vinnot.admin.infrastructure.web.request;
import jakarta.validation.constraints.Size;

public record UpdateUserAdminRequest(
        @Size(max = 100) String firstName,
        @Size(max = 100) String lastName,
        Boolean active
) {
}
