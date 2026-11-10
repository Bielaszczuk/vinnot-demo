package com.vinnot.ai.infrastructure.web.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.Objects;
import java.util.UUID;

public record CompareWinesRequest(
        @NotNull(message = "wineAId is required")
        UUID wineAId,

        @NotNull(message = "wineBId is required")
        UUID wineBId,

        @Size(max = 10)
        String language
) {

    public String getLanguageOrDefault() {
        return Objects.nonNull(language) && !language.isBlank() ? language : "es";
    }
}

