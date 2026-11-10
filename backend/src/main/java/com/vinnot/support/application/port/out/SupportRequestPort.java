package com.vinnot.support.application.port.out;
import com.vinnot.support.domain.model.SupportRequest;
public interface SupportRequestPort {
    void accept(SupportRequest request);
}

