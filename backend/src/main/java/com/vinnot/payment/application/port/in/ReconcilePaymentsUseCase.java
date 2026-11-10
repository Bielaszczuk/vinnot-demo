package com.vinnot.payment.application.port.in;
public interface ReconcilePaymentsUseCase {
    void execute(int limit);
}
