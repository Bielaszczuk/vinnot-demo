package com.vinnot.support.application.port.in;
import com.vinnot.support.domain.model.SupportRequest;
import java.util.UUID;
public interface SubmitSupportRequestUseCase {
    UUID submit(SupportRequest request);
}

