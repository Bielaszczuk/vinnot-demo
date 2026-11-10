package com.vinnot.wine.application.port.out;

import java.util.List;
import java.util.UUID;

/** Minimal author projection for the moderation workspace; no contact data. */
public interface WineSubmissionAuthorQueryPort {
    List<Author> findAllByIds(List<UUID> ids);
    record Author(UUID id, String username) { }
}
