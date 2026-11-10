package com.vinnot.shared.application.media;

import com.vinnot.shared.domain.valueobject.ResourceReader;
import java.util.UUID;

public interface CoverImageRegistryPort {
    void stage(UUID id, UUID owner, CoverImageUseCase.Kind kind, String url);
    void markReady(UUID id);
    boolean permitsRead(UUID id, ResourceReader reader);
    boolean retainsExistingReference(UUID id, CoverImageUseCase.Kind kind);
    boolean permitsAttachment(UUID id, CoverImageUseCase.Kind kind, ResourceReader actor);
    void reconcileLater(UUID id);
}
