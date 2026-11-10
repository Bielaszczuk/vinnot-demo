package com.vinnot.user.application.port.out;

import com.vinnot.user.application.port.out.model.SocialCredential;
import com.vinnot.user.application.port.out.model.VerifiedSocialIdentity;

public interface SocialIdentityVerifierPort {
    VerifiedSocialIdentity verify(SocialCredential credential);
}
