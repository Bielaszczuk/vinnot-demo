package com.vinnot.shared.infrastructure.storage;

import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import com.vinnot.shared.application.media.ImageOptimizationPort;
import com.vinnot.shared.application.port.FileStoragePort;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.io.ByteArrayInputStream;
import java.util.Arrays;

import static com.vinnot.shared.infrastructure.storage.SocialMediaObjectsTest.jpeg;
import static com.vinnot.shared.infrastructure.storage.SocialMediaObjectsTest.png;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class R2FileStorageServiceSocialMediaTest {
    private final S3Client r2 = mock(S3Client.class);
    private final FileStoragePort legacy = mock(FileStoragePort.class);
    private final R2OperationBudget budget = mock(R2OperationBudget.class);
    private final R2FileStorageService storage = new R2FileStorageService(r2, legacy, mock(ImageOptimizationPort.class),
            budget, mock(JdbcTemplate.class), mock(R2AvatarInventory.class),
            "test-uploads", "production", "https://images.vinnot.com");

    @Test
    void writesWithTheArgumentContentTypeWriteOnceUnderTheSocialNamespaceAndReturnsTheCdnUrl() {
        byte[] hero = png();
        byte[] slide = jpeg();

        assertThat(storage.storeSocialMedia("posts/p1/hero-ab.png", hero, "image/png"))
                .isEqualTo("https://images.vinnot.com/uploads/production/social/posts/p1/hero-ab.png");
        assertThat(storage.storeSocialMedia("posts/p1/ig-01-ab.jpg", slide, "image/jpeg"))
                .isEqualTo("https://images.vinnot.com/uploads/production/social/posts/p1/ig-01-ab.jpg");

        var puts = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(r2, times(2)).putObject(puts.capture(), any(RequestBody.class));
        assertThat(puts.getAllValues()).extracting(PutObjectRequest::key)
                .containsExactly("uploads/production/social/posts/p1/hero-ab.png", "uploads/production/social/posts/p1/ig-01-ab.jpg");
        assertThat(puts.getAllValues()).extracting(PutObjectRequest::contentType).containsExactly("image/png", "image/jpeg");
        assertThat(puts.getAllValues()).extracting(PutObjectRequest::contentLength)
                .containsExactly((long) hero.length, (long) slide.length);
        assertThat(puts.getAllValues()).allSatisfy(request -> {
            assertThat(request.bucket()).isEqualTo("test-uploads");
            assertThat(request.ifNoneMatch()).isEqualTo("*");
            assertThat(request.serverSideEncryption()).isNull();
        });
        verify(budget).reserveSocialWrite(hero.length);
        verify(budget).reserveSocialWrite(slide.length);
        verify(budget, never()).reserveWrite(anyLong());
        verifyNoInteractions(legacy);
    }

    @Test
    void anExhaustedBudgetStopsTheWriteBeforeR2IsCalled() {
        byte[] slide = jpeg();
        doThrow(new ExternalServiceUnavailableException("IMAGE_STORAGE_LIMIT", "limit", null))
                .when(budget).reserveSocialWrite(slide.length);

        assertThatThrownBy(() -> storage.storeSocialMedia("posts/p1/ig-01.jpg", slide, "image/jpeg"))
                .isInstanceOf(ExternalServiceUnavailableException.class);
        verifyNoInteractions(r2);
    }

    @Test
    void aRetriedWriteOfTheSameBytesSucceedsButDifferentContentIsNeverOverwritten() {
        byte[] slide = SocialMediaObjectsTest.image("jpeg", 4, 4);
        when(r2.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenThrow(S3Exception.builder().statusCode(412).build());
        when(r2.getObject(any(GetObjectRequest.class))).thenAnswer(call -> response(slide, "image/jpeg"));

        assertThat(storage.storeSocialMedia("posts/p1/ig-01.jpg", slide, "image/jpeg"))
                .endsWith("/social/posts/p1/ig-01.jpg");

        byte[] other = SocialMediaObjectsTest.image("jpeg", 8, 8);
        assertThatThrownBy(() -> storage.storeSocialMedia("posts/p1/ig-01.jpg", other, "image/jpeg"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Image already exists with different content");
        verify(budget, times(2)).reserveRead();
    }

    @Test
    void readsAreBudgetedVerifiedAgainstTheKeyTypeAndMissingObjectsAreEmpty() throws Exception {
        byte[] hero = png();
        when(r2.getObject(any(GetObjectRequest.class))).thenAnswer(call -> response(hero, "image/png"));

        var loaded = storage.loadSocialMedia("posts/p1/hero.png").orElseThrow();

        assertThat(loaded.contentType()).isEqualTo("image/png");
        assertThat(loaded.size()).isEqualTo(hero.length);
        assertThat(loaded.content().readAllBytes()).isEqualTo(hero);
        var gets = ArgumentCaptor.forClass(GetObjectRequest.class);
        verify(r2).getObject(gets.capture());
        assertThat(gets.getValue().key()).isEqualTo("uploads/production/social/posts/p1/hero.png");
        verify(budget).reserveRead();

        when(r2.getObject(any(GetObjectRequest.class))).thenThrow(NoSuchKeyException.builder().build());
        assertThat(storage.loadSocialMedia("posts/p1/missing.png")).isEmpty();
    }

    @Test
    void storedObjectsWithAWrongTypeOrOverTheSocialCapAreRejectedOnRead() {
        byte[] hero = png();
        when(r2.getObject(any(GetObjectRequest.class))).thenAnswer(call -> response(hero, "image/webp"));
        assertThatThrownBy(() -> storage.loadSocialMedia("posts/p1/hero.png"))
                .isInstanceOf(IllegalStateException.class);

        byte[] oversized = Arrays.copyOf(jpeg(), SocialMediaObjects.MAX_BYTES + 1);
        when(r2.getObject(any(GetObjectRequest.class))).thenAnswer(call -> response(oversized, "image/jpeg"));
        assertThatThrownBy(() -> storage.loadSocialMedia("posts/p1/ig.jpg"))
                .isInstanceOf(IllegalStateException.class);

        // A cover-sized cap must not apply: a 1 MB social object is still readable.
        byte[] large = Arrays.copyOf(jpeg(), 1024 * 1024);
        when(r2.getObject(any(GetObjectRequest.class))).thenAnswer(call -> response(large, "image/jpeg"));
        assertThat(storage.loadSocialMedia("posts/p1/large.jpg")).get()
                .extracting(FileStoragePort.StoredFile::size).isEqualTo((long) large.length);
    }

    @Test
    void deletesTheNamespacedObject() {
        storage.deleteSocialMedia("posts/p1/ig-01.jpg");

        var deletes = ArgumentCaptor.forClass(DeleteObjectRequest.class);
        verify(r2).deleteObject(deletes.capture());
        assertThat(deletes.getValue().key()).isEqualTo("uploads/production/social/posts/p1/ig-01.jpg");
        assertThat(deletes.getValue().bucket()).isEqualTo("test-uploads");
    }

    @Test
    void invalidKeysOrContentNeverReachR2OrTheBudget() {
        assertThatThrownBy(() -> storage.storeSocialMedia("../x.jpg", jpeg(), "image/jpeg"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> storage.storeSocialMedia("posts/x.jpg", png(), "image/png"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> storage.loadSocialMedia("posts/X.jpg"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> storage.deleteSocialMedia("posts/x.webp"))
                .isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(r2, budget);
    }

    private ResponseInputStream<GetObjectResponse> response(byte[] bytes, String contentType) {
        return new ResponseInputStream<>(GetObjectResponse.builder().contentType(contentType)
                .contentLength((long) bytes.length).build(), new ByteArrayInputStream(bytes));
    }
}
