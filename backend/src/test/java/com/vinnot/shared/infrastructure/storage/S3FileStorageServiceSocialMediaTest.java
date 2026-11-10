package com.vinnot.shared.infrastructure.storage;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.model.ServerSideEncryption;

import java.io.ByteArrayInputStream;
import java.util.Arrays;

import static com.vinnot.shared.infrastructure.storage.SocialMediaObjectsTest.jpeg;
import static com.vinnot.shared.infrastructure.storage.SocialMediaObjectsTest.png;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class S3FileStorageServiceSocialMediaTest {
    private final S3Client client = mock(S3Client.class);
    private final S3FileStorageService storage = new S3FileStorageService(client,
            "test-private-bucket", "avatars", "wine-labels", "wine-label-quarantine");

    @Test
    void writesPrivateEncryptedWriteOnceObjectsAndReturnsTheBackendServedPath() {
        byte[] hero = png();

        assertThat(storage.storeSocialMedia("posts/p1/hero-ab.png", hero, "image/png"))
                .isEqualTo("/api/uploads/social/posts/p1/hero-ab.png");

        var put = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(client).putObject(put.capture(), any(RequestBody.class));
        assertThat(put.getValue().bucket()).isEqualTo("test-private-bucket");
        assertThat(put.getValue().key()).isEqualTo("social/posts/p1/hero-ab.png");
        assertThat(put.getValue().contentType()).isEqualTo("image/png");
        assertThat(put.getValue().contentLength()).isEqualTo(hero.length);
        assertThat(put.getValue().ifNoneMatch()).isEqualTo("*");
        assertThat(put.getValue().serverSideEncryption()).isEqualTo(ServerSideEncryption.AES256);
    }

    @Test
    void aRetriedWriteOfTheSameBytesSucceedsButDifferentContentIsNeverOverwritten() {
        byte[] slide = SocialMediaObjectsTest.image("jpeg", 4, 4);
        when(client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenThrow(S3Exception.builder().statusCode(412).build());
        when(client.getObject(any(GetObjectRequest.class))).thenAnswer(call -> response(slide, "image/jpeg"));

        assertThat(storage.storeSocialMedia("posts/p1/ig-01.jpg", slide, "image/jpeg"))
                .isEqualTo("/api/uploads/social/posts/p1/ig-01.jpg");
        byte[] other = SocialMediaObjectsTest.image("jpeg", 8, 8);
        assertThatThrownBy(() -> storage.storeSocialMedia("posts/p1/ig-01.jpg", other, "image/jpeg"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Image already exists with different content");
    }

    @Test
    void otherS3FailuresPropagate() {
        when(client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenThrow(S3Exception.builder().statusCode(500).build());
        assertThatThrownBy(() -> storage.storeSocialMedia("posts/p1/ig-01.jpg", jpeg(), "image/jpeg"))
                .isInstanceOf(S3Exception.class);
    }

    @Test
    void loadsVerifiedObjectsAndMissingKeysAreEmpty() throws Exception {
        byte[] slide = jpeg();
        when(client.getObject(any(GetObjectRequest.class))).thenAnswer(call -> response(slide, "image/jpeg"));

        var loaded = storage.loadSocialMedia("posts/p1/ig-01.jpg").orElseThrow();

        assertThat(loaded.contentType()).isEqualTo("image/jpeg");
        assertThat(loaded.content().readAllBytes()).isEqualTo(slide);
        var get = ArgumentCaptor.forClass(GetObjectRequest.class);
        verify(client).getObject(get.capture());
        assertThat(get.getValue().key()).isEqualTo("social/posts/p1/ig-01.jpg");

        when(client.getObject(any(GetObjectRequest.class))).thenThrow(NoSuchKeyException.builder().build());
        assertThat(storage.loadSocialMedia("posts/p1/missing.jpg")).isEmpty();
    }

    @Test
    void oversizedStoredObjectsAreRejectedOnRead() {
        byte[] oversized = Arrays.copyOf(jpeg(), SocialMediaObjects.MAX_BYTES + 1);
        when(client.getObject(any(GetObjectRequest.class))).thenAnswer(call -> response(oversized, "image/jpeg"));
        assertThatThrownBy(() -> storage.loadSocialMedia("posts/p1/ig.jpg"))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void deletesTheObjectAndInvalidInputNeverReachesS3() {
        storage.deleteSocialMedia("posts/p1/ig-01.jpg");
        var delete = ArgumentCaptor.forClass(DeleteObjectRequest.class);
        verify(client).deleteObject(delete.capture());
        assertThat(delete.getValue().key()).isEqualTo("social/posts/p1/ig-01.jpg");

        S3Client untouched = mock(S3Client.class);
        var guarded = new S3FileStorageService(untouched, "b", "avatars", "wine-labels", "q");
        byte[] oversized = Arrays.copyOf(jpeg(), SocialMediaObjects.MAX_BYTES + 1);
        assertThatThrownBy(() -> guarded.storeSocialMedia("posts/x.jpg", oversized, "image/jpeg"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> guarded.storeSocialMedia("posts/x.png", jpeg(), "image/jpeg"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> guarded.loadSocialMedia("../x.png")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> guarded.deleteSocialMedia("x")).isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(untouched);
    }

    private ResponseInputStream<GetObjectResponse> response(byte[] bytes, String contentType) {
        return new ResponseInputStream<>(GetObjectResponse.builder().contentType(contentType)
                .contentLength((long) bytes.length).build(), new ByteArrayInputStream(bytes));
    }
}
