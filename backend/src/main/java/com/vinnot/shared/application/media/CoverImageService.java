package com.vinnot.shared.application.media;

import com.vinnot.shared.application.port.FileStoragePort;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.shared.domain.valueobject.ResourceReader;
import org.springframework.stereotype.Service;
import java.io.ByteArrayInputStream;
import java.util.Objects;
import java.util.UUID;

@Service
public class CoverImageService implements CoverImageUseCase {
    private static final String PREFIX = "/api/uploads/covers/";
    private final FileStoragePort storage;
    private final ImageOptimizationPort optimizer;
    private final CoverImageRegistryPort registry;
    private final CurrentActorPort actor;

    public CoverImageService(FileStoragePort storage, ImageOptimizationPort optimizer,
            CoverImageRegistryPort registry, CurrentActorPort actor) {
        this.storage = storage;
        this.optimizer = optimizer;
        this.registry = registry;
        this.actor = actor;
    }

    @Override
    public Result upload(Upload upload) {
        if (Objects.isNull(upload.owner())) { throw new DomainException("IMAGE_OWNER_REQUIRED", "Authentication is required"); }
        UUID id = UUID.randomUUID();
        String url = PREFIX + id + ".webp";
        registry.stage(id, upload.owner(), upload.kind(), url);
        var image = optimizer.optimize(upload.content(), upload.contentType(), upload.size(), ImageOptimizationPort.Purpose.COVER);
        storage.storeCover(new ByteArrayInputStream(image.bytes()), image.bytes().length, id);
        registry.markReady(id);
        return new Result(id, url, image.width(), image.height(), image.bytes().length);
    }

    @Override
    public FileStoragePort.StoredFile read(UUID id, ResourceReader reader) {
        if (!registry.permitsRead(id, reader)) { throw new EntityNotFoundException("Image not found"); }
        return storage.loadCover(id);
    }

    @Override
    public String validateReference(String url, String previousUrl, Kind kind) {
        if (Objects.isNull(url) || !url.contains("/uploads/covers/")) { return url; }
        String canonical = url.replaceFirst("^https://api(?:-dev)?\\.vinnot\\.com", "");
        UUID id = managedId(canonical);
        boolean permitted = Objects.equals(canonical, previousUrl)
                ? registry.retainsExistingReference(id, kind) : registry.permitsAttachment(id, kind, actor.current());
        if (!permitted) {
            throw new DomainException("IMAGE_OWNERSHIP", "Image does not belong to this account or resource type");
        }
        return canonical;
    }

    @Override
    public void reconcile(String url) {
        if (Objects.nonNull(url) && url.startsWith(PREFIX)) { registry.reconcileLater(managedId(url)); }
    }

    private UUID managedId(String url) {
        if (!url.matches("/api/uploads/covers/[0-9a-f-]{36}\\.webp")) {
            throw new DomainException("INVALID_IMAGE_REFERENCE", "Invalid managed image reference");
        }
        return UUID.fromString(url.substring(PREFIX.length(), url.length() - ".webp".length()));
    }
}
