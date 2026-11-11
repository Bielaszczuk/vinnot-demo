package com.vinnot.wine.infrastructure.ai;

import com.vinnot.wine.application.port.out.WineLabelCandidateVerificationPort;
import com.vinnot.wine.domain.model.WineLabelCandidate;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.List;

/** Without a real vision provider, scans keep the deterministic catalog ranking. */
@Component
@ConditionalOnProperty(name = "ai.provider", havingValue = "mock", matchIfMissing = true)
public class UnavailableWineLabelCandidateVerificationAdapter implements WineLabelCandidateVerificationPort {

    @Override
    public boolean isAvailable() {
        return false;
    }

    @Override
    public Verdict verify(byte[] photo, String contentType, List<WineLabelCandidate> candidates, Duration timeout) {
        return Verdict.none();
    }
}
