package com.vinnot.user.infrastructure.web.request;

import jakarta.validation.constraints.Size;

/** Omitted fields keep their stored value; the domain validates the supported values. */
public record UpdatePreferencesRequest(
        @Size(max = 8, message = "Preferred language must be at most 8 characters")
        String preferredLanguage,

        @Size(max = 64, message = "Timezone must be at most 64 characters")
        String timezone
) {
}
