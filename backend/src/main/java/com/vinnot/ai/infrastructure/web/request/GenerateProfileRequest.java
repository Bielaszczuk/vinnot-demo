package com.vinnot.ai.infrastructure.web.request;

import jakarta.validation.constraints.Size;

public record GenerateProfileRequest(
        @Size(max = 10) String language
) {
}
