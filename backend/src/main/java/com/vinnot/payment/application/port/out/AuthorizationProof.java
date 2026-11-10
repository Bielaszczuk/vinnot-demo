package com.vinnot.payment.application.port.out;

public interface AuthorizationProof {
    String randomToken();
    String digest(String value);
}
