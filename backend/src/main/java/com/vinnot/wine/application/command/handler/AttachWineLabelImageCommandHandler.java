package com.vinnot.wine.application.command.handler;

import com.vinnot.shared.application.port.FileStoragePort;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.wine.application.command.model.AttachWineLabelImageCommand;
import com.vinnot.wine.application.port.in.AttachWineLabelImageUseCase;
import com.vinnot.wine.application.port.out.WineLabelRecognitionPort;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.application.port.out.WineSubmissionModerationPort;
import com.vinnot.wine.application.port.out.WineryQueryPort;
import com.vinnot.wine.application.query.response.WineLabelImageAttachmentResponse;
import com.vinnot.wine.application.service.WineLabelCatalogMatcher;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.model.WineSubmission;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import com.vinnot.wine.application.service.WineLabelImagePublicationService;

import java.io.ByteArrayInputStream;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AttachWineLabelImageCommandHandler
        implements AttachWineLabelImageUseCase {

    private final WineRepositoryPort wineRepository;
    private final WineryQueryPort wineryQueryPort;
    private final WineLabelRecognitionPort recognitionPort;
    private final WineLabelCatalogMatcher catalogMatcher;
    private final WineSubmissionModerationPort moderationPort;
    private final FileStoragePort fileStoragePort;
    private final WineLabelImagePublicationService publication;

    @Override
    public WineLabelImageAttachmentResponse execute(AttachWineLabelImageCommand command) {
        Wine wine = wineRepository.findById(command.wineId())
                .orElseThrow(() -> new EntityNotFoundException("Wine not found"));
        if (hasText(wine.getImageUrl())) {
            return new WineLabelImageAttachmentResponse(
                    wine.getId(), wine.getImageUrl(), false);
        }
        var extracted = recognitionPort.recognize(
                command.imageBytes(), command.contentType());
        var match = catalogMatcher.match(extracted);
        boolean compatible = match.exact() && match.ranked().stream().findFirst()
                .filter(candidate -> candidate.candidate().id().equals(wine.getId()))
                .isPresent();
        if (!extracted.wineLabel() || !compatible) {
            throw new DomainException(
                    "LABEL_IMAGE_WINE_MISMATCH",
                    "The captured label could not be verified for this wine");
        }
        String wineryName = Objects.nonNull(wine.getWineryId())
                ? wineryQueryPort.findById(wine.getWineryId())
                        .map(WineryQueryPort.WineryData::name).orElse("Unknown winery")
                : "Unknown winery";
        WineSubmission moderationSubject = WineSubmission.create(
                command.userId(), wine.getName(), wineryName,
                wine.getWineType().name(), wine.getVintage(),
                List.copyOf(wine.getGrapes()), wine.getCountryName(),
                wine.getRegionName(), wine.getAlcoholContent(), null);
        var safety = moderationPort.reviewSafety(
                moderationSubject, command.imageBytes(), command.contentType());
        if (!safety.completed() || !safety.safe()) {
            throw new DomainException(
                    "LABEL_IMAGE_REVIEW_REQUIRED",
                    "The captured image could not be approved automatically");
        }
        String imageUrl = fileStoragePort.storeWineLabel(
                new ByteArrayInputStream(command.imageBytes()),
                command.originalFilename(), command.contentType(),
                command.imageBytes().length, UUID.randomUUID());
        // Storage records durable orphan reconciliation before uploading. A losing publication
        // keeps its unique object unreferenced, so cleanup cannot delete the winning image.
        return publication.publish(wine.getId(), wine.getRevision(), imageUrl);
    }

    private boolean hasText(String value) {
        return Objects.nonNull(value) && !value.isBlank();
    }
}
