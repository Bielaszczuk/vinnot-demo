package com.vinnot.shared.infrastructure.web.controller;

import com.vinnot.shared.application.dto.PublicFileResponse;
import com.vinnot.shared.application.port.in.GetPublicUploadUseCase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.io.ByteArrayInputStream;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SocialMediaControllerTest {
    private final GetPublicUploadUseCase uploads = mock(GetPublicUploadUseCase.class);
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(new SocialMediaController(uploads)).build();
    }

    @Test
    void streamsANestedKeyWithItsContentTypeAndImmutableCaching() throws Exception {
        byte[] bytes = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 1};
        when(uploads.getSocialMedia("posts/p1/ig-01-ab.jpg"))
                .thenReturn(Optional.of(new PublicFileResponse(new ByteArrayInputStream(bytes), "image/jpeg", bytes.length)));

        mvc.perform(get("/uploads/social/posts/p1/ig-01-ab.jpg"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "image/jpeg"))
                .andExpect(header().longValue("Content-Length", bytes.length))
                .andExpect(header().string("Cache-Control", "max-age=31536000, public, immutable"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(content().bytes(bytes));
        verify(uploads).getSocialMedia("posts/p1/ig-01-ab.jpg");
    }

    @Test
    void anUnknownKeyIsNotFound() throws Exception {
        when(uploads.getSocialMedia("posts/p1/missing.png")).thenReturn(Optional.empty());

        mvc.perform(get("/uploads/social/posts/p1/missing.png"))
                .andExpect(status().isNotFound())
                .andExpect(header().doesNotExist("Cache-Control"));
    }

    @Test
    void anInvalidKeyIsNotFound() throws Exception {
        when(uploads.getSocialMedia(anyString())).thenThrow(new IllegalArgumentException("Invalid social media key"));

        mvc.perform(get("/uploads/social/posts/P1/Slide.JPG")).andExpect(status().isNotFound());
        mvc.perform(get("/uploads/social/")).andExpect(status().isNotFound());
    }
}
