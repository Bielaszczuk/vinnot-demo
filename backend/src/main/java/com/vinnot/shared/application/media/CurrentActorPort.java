package com.vinnot.shared.application.media;

import com.vinnot.shared.domain.valueobject.ResourceReader;

/** Trusted identity supplied at composition, never read from an image URL or multipart field. */
public interface CurrentActorPort {
    ResourceReader current();
}
