package com.vinnot.marketing.application.port.in;

import com.vinnot.marketing.application.model.SocialPostAdminResponse;
import com.vinnot.marketing.domain.model.SocialNetwork;

import java.time.Instant;
import java.util.UUID;

/** The admin retries a post's failed publication on one network (#510 S3). */
public interface RetrySocialPublicationUseCase {

    SocialPostAdminResponse retry(UUID postId, SocialNetwork network, Instant now);
}
