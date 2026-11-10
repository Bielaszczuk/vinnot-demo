package com.vinnot.sharing.application.port.out;

import com.vinnot.sharing.domain.SharedContent;
import com.vinnot.sharing.domain.SharedContentKind;
import java.util.Optional;
import java.util.UUID;

public interface SharedContentQueryPort {
    Optional<SharedContent> findPublic(SharedContentKind kind, UUID id, boolean english);
}
