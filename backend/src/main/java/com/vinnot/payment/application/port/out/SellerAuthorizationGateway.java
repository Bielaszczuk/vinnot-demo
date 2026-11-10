package com.vinnot.payment.application.port.out;

import com.vinnot.payment.domain.model.SellerCredentials;
import java.net.URI;

public interface SellerAuthorizationGateway {
    URI authorizationUrl(String state, String challenge);
    SellerCredentials exchange(String code, String verifier);
}
