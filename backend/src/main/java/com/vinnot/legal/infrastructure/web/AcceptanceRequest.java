package com.vinnot.legal.infrastructure.web;

import com.vinnot.legal.domain.model.TermsSelection;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AcceptanceRequest(
        @NotBlank @Size(max = 40) String version,
        @Pattern(regexp = "es|en") @NotNull String locale,
        @Pattern(regexp = "[a-f0-9]{64}") @NotNull String contentHash,
        @AssertTrue boolean accepted) {
    public TermsSelection selection() {
        return new TermsSelection(version, locale, contentHash, accepted);
    }
}
