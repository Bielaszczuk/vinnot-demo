package com.vinnot.wine.application.service;

import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.application.query.response.WineLabelImageAttachmentResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;
import java.util.UUID;

/** Publishes verified media in a short transaction, never replacing another writer's image. */
@Service
@RequiredArgsConstructor
public class WineLabelImagePublicationService {
    private final WineRepositoryPort wines;

    @Transactional
    public WineLabelImageAttachmentResponse publish(UUID wineId, long verifiedRevision, String imageUrl) {
        var current = wines.findByIdForUpdate(wineId)
                .orElseThrow(() -> new EntityNotFoundException("Wine not found"));
        if (Objects.nonNull(current.getImageUrl()) && !current.getImageUrl().isBlank()) {
            return new WineLabelImageAttachmentResponse(wineId, current.getImageUrl(), false);
        }
        if (current.getRevision() != verifiedRevision) {
            throw new DomainException("LABEL_IMAGE_REVIEW_REQUIRED", "Wine changed while its label was being verified");
        }
        current.updateImageUrl(imageUrl);
        wines.save(current);
        return new WineLabelImageAttachmentResponse(wineId, imageUrl, true);
    }
}
