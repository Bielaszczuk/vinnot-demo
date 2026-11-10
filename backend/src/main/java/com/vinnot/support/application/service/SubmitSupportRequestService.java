package com.vinnot.support.application.service;

import com.vinnot.support.application.port.in.SubmitSupportRequestUseCase;
import com.vinnot.support.application.port.out.SupportRequestPort;
import com.vinnot.support.domain.model.SupportRequest;
import org.springframework.stereotype.Service;
import java.util.UUID;

@Service
public class SubmitSupportRequestService implements SubmitSupportRequestUseCase {
    private final SupportRequestPort requests;
    public SubmitSupportRequestService(SupportRequestPort requests) { this.requests = requests; }
    @Override
    public UUID submit(SupportRequest request) {
        requests.accept(request);
        return request.requestId();
    }
}

