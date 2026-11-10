package com.vinnot.wine.infrastructure.web.controller;

import com.vinnot.shared.infrastructure.web.GlobalExceptionHandler;
import com.vinnot.wine.application.command.model.SubmitWineCommand;
import com.vinnot.wine.application.port.in.GetMyWineSubmissionsUseCase;
import com.vinnot.wine.application.port.in.GetWineSubmissionUseCase;
import com.vinnot.wine.application.port.in.SubmitWineUseCase;
import com.vinnot.wine.application.query.response.WineSubmissionResponse;
import com.vinnot.wine.domain.model.WineSubmissionStatus;
import com.vinnot.wine.infrastructure.web.WineLabelUploadValidator;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.core.MethodParameter;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class WineSubmissionMultipartContractTest {

    @Test
    void bindsAndSanitizesARealMultipartSubmission() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID submissionId = UUID.randomUUID();
        SubmitWineUseCase submitUseCase = mock(SubmitWineUseCase.class);
        when(submitUseCase.execute(any())).thenReturn(new WineSubmissionResponse(
                submissionId, WineSubmissionStatus.NEEDS_REVIEW,
                "Manual review required", null));
        WineSubmissionController controller = new WineSubmissionController(
                submitUseCase,
                new WineLabelUploadValidator(),
                mock(GetMyWineSubmissionsUseCase.class),
                mock(GetWineSubmissionUseCase.class));
        MockMvc mvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(principalResolver(userId))
                .build();
        MockMultipartFile image = new MockMultipartFile(
                "image", "label.png", "image/png", validLabelImage());

        mvc.perform(multipart("/wines/submissions")
                        .file(image)
                        .param("wineName", "Malbec Reserva")
                        .param("wineryName", "Bodega Norte")
                        .param("wineType", "RED")
                        .param("country", "Argentina"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.submissionId").value(submissionId.toString()))
                .andExpect(jsonPath("$.status").value("NEEDS_REVIEW"));
    }

    @Test
    void bindsOptionalCatalogPicksAndKeepsThemAbsentForOlderApps() throws Exception {
        UUID userId = UUID.randomUUID();
        SubmitWineUseCase submitUseCase = mock(SubmitWineUseCase.class);
        when(submitUseCase.execute(any())).thenReturn(new WineSubmissionResponse(
                UUID.randomUUID(), WineSubmissionStatus.NEEDS_REVIEW, "Manual review required", null));
        MockMvc mvc = MockMvcBuilders.standaloneSetup(new WineSubmissionController(
                        submitUseCase, new WineLabelUploadValidator(),
                        mock(GetMyWineSubmissionsUseCase.class), mock(GetWineSubmissionUseCase.class)))
                .setCustomArgumentResolvers(principalResolver(userId))
                .build();
        UUID winery = UUID.randomUUID();
        UUID country = UUID.randomUUID();
        UUID region = UUID.randomUUID();

        mvc.perform(multipart("/wines/submissions")
                        .file(new MockMultipartFile("image", "label.png", "image/png", validLabelImage()))
                        .param("wineName", "Malbec Reserva")
                        .param("wineryName", "Bodega Norte")
                        .param("wineryId", winery.toString())
                        .param("countryId", country.toString())
                        .param("regionId", region.toString()))
                .andExpect(status().isAccepted());
        mvc.perform(multipart("/wines/submissions")
                        .file(new MockMultipartFile("image", "label.png", "image/png", validLabelImage()))
                        .param("wineName", "Malbec Reserva")
                        .param("wineryName", "Bodega Norte")
                        .param("country", "Argentina"))
                .andExpect(status().isAccepted());

        ArgumentCaptor<SubmitWineCommand> captor = ArgumentCaptor.forClass(SubmitWineCommand.class);
        verify(submitUseCase, times(2)).execute(captor.capture());
        var picked = captor.getAllValues().get(0);
        assertThat(picked.wineryId()).isEqualTo(winery);
        assertThat(picked.countryId()).isEqualTo(country);
        assertThat(picked.regionId()).isEqualTo(region);
        var legacy = captor.getAllValues().get(1);
        assertThat(legacy.country()).isEqualTo("Argentina");
        assertThat(legacy.wineryId()).isNull();
        assertThat(legacy.countryId()).isNull();
        assertThat(legacy.regionId()).isNull();
    }

    @Test
    void acceptsASubmissionWithoutALabelPhotoAndStillRejectsAnEmptyImagePart() throws Exception {
        UUID userId = UUID.randomUUID();
        SubmitWineUseCase submitUseCase = mock(SubmitWineUseCase.class);
        when(submitUseCase.execute(any())).thenReturn(new WineSubmissionResponse(
                UUID.randomUUID(), WineSubmissionStatus.NEEDS_REVIEW, "Manual review required", null));
        MockMvc mvc = MockMvcBuilders.standaloneSetup(new WineSubmissionController(
                        submitUseCase, new WineLabelUploadValidator(),
                        mock(GetMyWineSubmissionsUseCase.class), mock(GetWineSubmissionUseCase.class)))
                .setCustomArgumentResolvers(principalResolver(userId))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        mvc.perform(multipart("/wines/submissions")
                        .param("wineName", "Malbec Reserva")
                        .param("wineryName", "Bodega Norte")
                        .param("wineType", "RED")
                        .param("country", "Argentina"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("NEEDS_REVIEW"));

        ArgumentCaptor<SubmitWineCommand> captor = ArgumentCaptor.forClass(SubmitWineCommand.class);
        verify(submitUseCase).execute(captor.capture());
        assertThat(captor.getValue().hasLabelPhoto()).isFalse();
        assertThat(captor.getValue().imageBytes()).isNull();

        mvc.perform(multipart("/wines/submissions")
                        .file(new MockMultipartFile("image", "label.png", "image/png", new byte[0]))
                        .param("wineName", "Malbec Reserva")
                        .param("wineryName", "Bodega Norte")
                        .param("wineType", "RED")
                        .param("country", "Argentina"))
                .andExpect(status().is4xxClientError())
                .andExpect(jsonPath("$.code").value("INVALID_LABEL_IMAGE"));
        verify(submitUseCase, times(1)).execute(any());
    }

    private HandlerMethodArgumentResolver principalResolver(UUID userId) {
        return new HandlerMethodArgumentResolver() {
            @Override
            public boolean supportsParameter(MethodParameter parameter) {
                return parameter.hasParameterAnnotation(AuthenticationPrincipal.class);
            }

            @Override
            public Object resolveArgument(
                    MethodParameter parameter,
                    ModelAndViewContainer container,
                    NativeWebRequest request,
                    WebDataBinderFactory binderFactory) {
                return userId.toString();
            }
        };
    }

    private byte[] validLabelImage() throws Exception {
        BufferedImage image = new BufferedImage(800, 800, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = image.createGraphics();
        try {
            graphics.setColor(Color.WHITE);
            graphics.fillRect(0, 0, image.getWidth(), image.getHeight());
            graphics.setColor(Color.BLACK);
            for (int index = 0; index < image.getWidth(); index += 20) {
                graphics.fillRect(index, 0, 10, image.getHeight());
            }
        } finally {
            graphics.dispose();
        }
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(image, "png", output);
        return output.toByteArray();
    }
}
