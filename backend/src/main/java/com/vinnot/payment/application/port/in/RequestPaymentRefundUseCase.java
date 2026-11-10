package com.vinnot.payment.application.port.in;
import java.util.UUID;
public interface RequestPaymentRefundUseCase { void request(UUID attemptId, UUID actorId); }
