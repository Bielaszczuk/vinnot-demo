package com.vinnot.payment.application.port.out;
import com.vinnot.payment.domain.model.SellerCredentials;
public interface SellerCredentialRenewalGateway {
    SellerCredentials renew(SellerCredentials credentials);
}
