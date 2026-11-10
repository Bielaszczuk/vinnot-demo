package com.vinnot.shared.infrastructure.storage;

import com.vinnot.shared.application.media.ImageOptimizationPort;
import com.vinnot.shared.application.port.FileStoragePort;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.shared.infrastructure.media.WebpImageOptimizer;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import java.util.UUID;
import java.time.Instant;
import java.util.List;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class R2FileStorageServiceTest {
    private final S3Client r2 = mock(S3Client.class);
    private final FileStoragePort legacy = mock(FileStoragePort.class);
    private final ImageOptimizationPort optimizer = mock(ImageOptimizationPort.class);
    private final R2OperationBudget budget = mock(R2OperationBudget.class);
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final R2AvatarInventory inventory = mock(R2AvatarInventory.class);
    private final R2FileStorageService storage = new R2FileStorageService(r2, legacy, optimizer, budget, jdbc, inventory,
            "test-uploads", "development", "https://images.vinnot.com");

    @Test
    void writesWebpToEnvironmentNamespaceWithoutAwsEncryptionAndKeepsQuarantinePrivate() {
        byte[] image = {1, 2};
        when(optimizer.optimize(any(), any(), anyLong(), any())).thenReturn(new ImageOptimizationPort.OptimizedImage(image, 1, 1));
        UUID owner = UUID.randomUUID();
        UUID id = UUID.randomUUID();
        String avatar = storage.storeAvatar(new ByteArrayInputStream(image), "raw.png", "image/png", 2, owner);
        assertThat(avatar).startsWith("https://images.vinnot.com/uploads/development/avatars/avatar_" + owner).endsWith(".r2.webp");
        verify(inventory).record(owner, avatar);
        assertThat(storage.storeWineLabel(new ByteArrayInputStream(image), "raw.jpg", "image/jpeg", 2, id))
                .isEqualTo("https://images.vinnot.com/uploads/development/wine-labels/wine_label_" + id + ".r2.webp");
        assertThat(storage.storeQuarantinedWineLabel(new ByteArrayInputStream(image), "raw.jpg", "image/jpeg", 2, id))
                .isEqualTo("/api/admin/wine-submissions/" + id + "/image");
        var puts = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(r2, times(3)).putObject(puts.capture(), any(RequestBody.class));
        assertThat(puts.getAllValues()).allSatisfy(request -> {
            assertThat(request.contentType()).isEqualTo("image/webp");
            assertThat(request.serverSideEncryption()).isNull();
            assertThat(request.ifNoneMatch()).isEqualTo("*");
        });
        assertThat(puts.getAllValues().get(2).key()).startsWith("uploads/development/quarantine/");
        verify(budget, times(3)).reserveWrite(2);
    }

    @Test
    void legacyReadsInventoryAndDeletionRemainCompatible() {
        String filename = "avatar_" + UUID.randomUUID() + "_old.png";
        storage.loadAvatar(filename);
        storage.loadWineLabel("wine_label_" + UUID.randomUUID() + ".jpg");
        UUID owner = UUID.randomUUID();
        Instant before = Instant.now();
        when(legacy.listAvatarUrls(owner, before)).thenReturn(List.of("old"));
        assertThat(storage.listAvatarUrls(owner, before)).containsExactly("old");
        verify(legacy).loadAvatar(filename);
        UUID id = UUID.randomUUID();
        when(r2.getObject(any(GetObjectRequest.class))).thenThrow(NoSuchKeyException.builder().build());
        byte[] old = {1, 2};
        when(legacy.loadQuarantinedWineLabel(id)).thenAnswer(call -> new FileStoragePort.StoredFile(new ByteArrayInputStream(old), "image/jpeg", old.length));
        when(optimizer.optimize(any(), any(), anyLong(), eq(ImageOptimizationPort.Purpose.LABEL)))
                .thenReturn(new ImageOptimizationPort.OptimizedImage(new byte[]{3, 4}, 1, 1));
        storage.loadQuarantinedWineLabel(id);
        assertThat(storage.promoteQuarantinedWineLabel(id)).contains("images.vinnot.com/uploads/development/wine-labels/");
        verify(legacy, times(2)).loadQuarantinedWineLabel(id);
        verify(legacy, never()).promoteQuarantinedWineLabel(id);
        storage.deleteWineLabel(id);
        verify(legacy).deletePublicWineLabel(id);
        verify(legacy).deleteQuarantinedWineLabel(id);
    }

    @Test
    void publicationRetryVerifiesSameBytesAndRejectsConflicts() throws Exception {
        var png = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(1, 1, BufferedImage.TYPE_INT_RGB), "png", png);
        var optimized = new WebpImageOptimizer(System.getenv().getOrDefault("VINNOT_WEBP_ENCODER", "cwebp"), 1)
                .optimize(new ByteArrayInputStream(png.toByteArray()), "image/png", png.size(), ImageOptimizationPort.Purpose.LABEL);
        byte[] image = optimized.bytes();
        UUID id = UUID.randomUUID();
        when(r2.getObject(any(GetObjectRequest.class))).thenAnswer(call -> response(image));
        when(r2.putObject(any(PutObjectRequest.class), any(RequestBody.class))).thenThrow(S3Exception.builder().statusCode(412).build());
        assertThat(storage.promoteQuarantinedWineLabel(id)).endsWith("wine_label_" + id + ".r2.webp");
        var puts = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(r2).putObject(puts.capture(), any(RequestBody.class));
        assertThat(puts.getValue().key()).startsWith("uploads/development/wine-labels/");
        verify(budget, times(2)).reserveRead();
        assertThatThrownBy(() -> storage.deleteAvatar("https://images.vinnot.com/uploads/development/avatars/avatar_" + UUID.randomUUID() + "_" + UUID.randomUUID() + ".r2.webp", UUID.randomUUID()))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void conflictingObjectCannotBeOverwrittenAndMissingCoverIsNotFound() throws Exception {
        byte[] source = {1, 2};
        when(optimizer.optimize(any(), any(), anyLong(), any())).thenReturn(new ImageOptimizationPort.OptimizedImage(source, 1, 1));
        when(r2.putObject(any(PutObjectRequest.class), any(RequestBody.class))).thenThrow(S3Exception.builder().statusCode(412).build());
        when(r2.getObject(any(GetObjectRequest.class))).thenThrow(NoSuchKeyException.builder().build());
        UUID id = UUID.randomUUID();
        when(jdbc.queryForObject(anyString(), eq(Boolean.class), eq(id))).thenReturn(true);
        when(jdbc.queryForObject(anyString(), eq(String.class), eq(id))).thenReturn("EVENT");
        assertThatThrownBy(() -> storage.loadCover(id)).isInstanceOf(EntityNotFoundException.class);
        var png = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(1, 1, BufferedImage.TYPE_INT_RGB), "png", png);
        byte[] stored = new WebpImageOptimizer(System.getenv().getOrDefault("VINNOT_WEBP_ENCODER", "cwebp"), 1)
                .optimize(new ByteArrayInputStream(png.toByteArray()), "image/png", png.size(), ImageOptimizationPort.Purpose.LABEL).bytes();
        when(r2.getObject(any(GetObjectRequest.class))).thenAnswer(call -> response(stored));
        assertThatThrownBy(() -> storage.storeWineLabel(new ByteArrayInputStream(source), "x.png", "image/png", 2, id))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("different content");
    }

    private ResponseInputStream<GetObjectResponse> response(byte[] bytes) {
        return new ResponseInputStream<>(GetObjectResponse.builder().contentType("image/webp").contentLength((long) bytes.length).build(), new ByteArrayInputStream(bytes));
    }
}
