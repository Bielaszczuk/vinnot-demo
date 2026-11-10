package com.vinnot.sharing.application.port.in;

import com.vinnot.sharing.domain.SharedContent;
import com.vinnot.sharing.domain.SharedContentKind;
import java.util.Optional;
import java.util.UUID;

public interface GetSharedContentUseCase {
    Optional<SharedContent> execute(SharedContentKind kind, UUID id, boolean english);
}
