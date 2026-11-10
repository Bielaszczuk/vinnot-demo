package com.vinnot.payment.infrastructure.security;

import org.junit.jupiter.api.Test;
import java.util.Base64;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PaymentCredentialCipherTest {
    private final PaymentCredentialCipher cipher = new PaymentCredentialCipher(Base64.getEncoder().encodeToString(new byte[32]));

    @Test
    void encryptsWithFreshNonceAndAuthenticatesOwnerAndPurpose() {
        String first = cipher.encrypt("provider-secret", "owner:access");
        String second = cipher.encrypt("provider-secret", "owner:access");
        assertThat(first).isNotEqualTo(second).doesNotContain("provider-secret");
        assertThat(cipher.decrypt(first, "owner:access")).isEqualTo("provider-secret");
        assertThatThrownBy(() -> cipher.decrypt(first, "other-owner:access")).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> cipher.decrypt(first, "owner:refresh")).isInstanceOf(IllegalStateException.class);
        byte[] tampered = Base64.getDecoder().decode(first.substring(3));
        tampered[tampered.length - 1] ^= 1;
        assertThatThrownBy(() -> cipher.decrypt("v1:" + Base64.getEncoder().encodeToString(tampered), "owner:access"))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void rejectsWeakKeysAndMalformedEnvelopes() {
        assertThatThrownBy(() -> new PaymentCredentialCipher("not-base64")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new PaymentCredentialCipher(Base64.getEncoder().encodeToString(new byte[16])))
                .isInstanceOf(IllegalArgumentException.class);
        for (String value : new String[]{"v2:abc", "plain", "v1:!", "v1:YWJj"}) {
            assertThatThrownBy(() -> cipher.decrypt(value, "context")).isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Test
    void generatesUnpredictablePkceProofsUsingTheStandardSha256Vector() {
        var proof = new SecureAuthorizationProof();
        assertThat(proof.randomToken()).matches("[A-Za-z0-9_-]{43}").isNotEqualTo(proof.randomToken());
        assertThat(proof.digest("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"))
                .isEqualTo("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
    }
}
