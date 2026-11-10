package com.vinnot.shared.infrastructure.storage;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.ServerSideEncryption;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class S3FileStorageServiceTest {
    private final S3Client client = mock(S3Client.class);
    private final S3FileStorageService storage = new S3FileStorageService(client,
            "test-private-bucket", "avatars", "wine-labels", "wine-label-quarantine");

    @Test
    void allThreeUploadFlowsRetainPrivateKeysMimeAndEncryption() throws Exception {
        var output = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(1, 1, BufferedImage.TYPE_INT_RGB), "png", output);
        byte[] image = output.toByteArray();
        var id = UUID.randomUUID();
        assertThat(storage.storeAvatar(new ByteArrayInputStream(image), "x.png", "image/png", image.length, id))
                .startsWith("/api/uploads/avatars/avatar_" + id);
        assertThat(storage.storeWineLabel(new ByteArrayInputStream(image), "x.png", "image/png", image.length, id))
                .isEqualTo("/api/uploads/wine-labels/wine_label_" + id + ".png");
        assertThat(storage.storeQuarantinedWineLabel(new ByteArrayInputStream(image), "x.png", "image/png", image.length, id))
                .isEqualTo("/api/admin/wine-submissions/" + id + "/image");
        var requests = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(client, times(3)).putObject(requests.capture(), any(RequestBody.class));
        assertThat(requests.getAllValues()).allSatisfy(request -> {
            assertThat(request.bucket()).isEqualTo("test-private-bucket");
            assertThat(request.contentType()).isEqualTo("image/png");
            assertThat(request.contentLength()).isEqualTo(image.length);
            assertThat(request.serverSideEncryption()).isEqualTo(ServerSideEncryption.AES256);
        });
        assertThat(requests.getAllValues().get(2).key()).startsWith("wine-label-quarantine/");
    }

    @Test
    void falseDeclaredSizeCannotBypassTheReadLimitOrContactS3() {
        byte[] bytes = new byte[8 * 1024 * 1024 + 1];
        var id = UUID.randomUUID();
        assertThatThrownBy(() -> storage.storeAvatar(new ByteArrayInputStream(bytes), "x.png", "image/png", 1, id))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> storage.storeWineLabel(new ByteArrayInputStream(bytes), "x.png", "image/png", 1, id))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> storage.storeQuarantinedWineLabel(new ByteArrayInputStream(bytes), "x.png", "image/png", 1, id))
                .isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(client);
    }
}
