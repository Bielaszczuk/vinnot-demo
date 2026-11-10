package com.vinnot.shared.infrastructure.ai;

import com.vinnot.shared.application.port.AiProviderAdmissionPort;
import java.math.BigDecimal;
import java.util.Set;
import java.util.UUID;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;

/** Explicit test-only admission; never a production fallback when accounting is unavailable. */
public final class OpenAiTestFixtures {
    private OpenAiTestFixtures() {
    }

    public static AiProviderAdmissionPort admission() {
        var admission = mock(AiProviderAdmissionPort.class);
        when(admission.acquire(anyString(), any())).thenAnswer(invocation ->
                new AiProviderAdmissionPort.Permit(UUID.randomUUID(), "test", UUID.randomUUID()));
        return admission;
    }

    public static OpenAiPricingPolicy pricing() {
        return new OpenAiPricingPolicy(Set.of("gpt-4o-mini", "vision-contract-model"),
                new BigDecimal("0.15"), new BigDecimal("0.60"), 128000, 16384, Set.of("default"));
    }
}
