package com.vinnot.wine.infrastructure.web.controller;

import com.vinnot.shared.infrastructure.web.GlobalExceptionHandler;
import com.vinnot.wine.application.command.exception.WineLabelScanFeedbackNotFoundException;
import com.vinnot.wine.application.command.model.ScanWineLabelCommand;
import com.vinnot.wine.application.command.model.SubmitWineLabelScanFeedbackCommand;
import com.vinnot.wine.application.port.in.AttachWineLabelImageUseCase;
import com.vinnot.wine.application.port.in.ScanWineLabelUseCase;
import com.vinnot.wine.application.port.in.SubmitWineLabelScanFeedbackUseCase;
import com.vinnot.wine.application.query.response.WineLabelScanResponse;
import com.vinnot.wine.domain.model.WineLabelScanVerdict;
import com.vinnot.wine.infrastructure.web.WineLabelBarcodeValidator;
import com.vinnot.wine.infrastructure.web.WineLabelObservedTextValidator;
import com.vinnot.wine.infrastructure.web.WineLabelScanExceptionHandler;
import com.vinnot.wine.infrastructure.web.WineLabelUploadValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** S12: the scan accepts an optional barcode and answers its scan id; members send feedback on their scans. */
class WineLabelScanControllerTest {
    private static byte[] labelImage;

    private final UUID member = UUID.randomUUID();
    private final ScanWineLabelUseCase scan = mock(ScanWineLabelUseCase.class);
    private final SubmitWineLabelScanFeedbackUseCase feedback = mock(SubmitWineLabelScanFeedbackUseCase.class);
    private MockMvc mvc;

    @BeforeEach
    void setUp() throws Exception {
        if (labelImage == null) {
            labelImage = validLabelImage();
        }
        WineLabelScanController controller = new WineLabelScanController(
                scan, new WineLabelUploadValidator(), new WineLabelObservedTextValidator(),
                mock(AttachWineLabelImageUseCase.class), new WineLabelBarcodeValidator(), feedback);
        mvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(principalResolver())
                .setControllerAdvice(new WineLabelScanExceptionHandler(), new GlobalExceptionHandler())
                .build();
    }

    @ParameterizedTest
    @ValueSource(strings = {"12345670", "012345678905", "7791234567898", "17791234567895"})
    void aValidBarcodeReachesTheScanAndTheScanIdIsAnswered(String barcode) throws Exception {
        UUID scanId = UUID.randomUUID();
        when(scan.execute(any())).thenReturn(new WineLabelScanResponse(WineLabelScanResponse.Outcome.NO_MATCH, 0.0,
                null, List.of(), List.of(), null, scanId));

        mvc.perform(multipart("/wines/scan").file(image()).param("barcode", barcode))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scanId").value(scanId.toString()))
                .andExpect(jsonPath("$.outcome").value("NO_MATCH"));

        ArgumentCaptor<ScanWineLabelCommand> command = ArgumentCaptor.forClass(ScanWineLabelCommand.class);
        verify(scan).execute(command.capture());
        assertThat(command.getValue().barcode()).isEqualTo(barcode);
        assertThat(command.getValue().userId()).isEqualTo(member);
    }

    @Test
    void aScanWithoutABarcodeStillWorksAsBefore() throws Exception {
        when(scan.execute(any())).thenReturn(new WineLabelScanResponse(WineLabelScanResponse.Outcome.NO_MATCH, 0.0,
                null, List.of(), List.of(), null));

        mvc.perform(multipart("/wines/scan").file(image()).param("observedText", "MALBEC"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.outcome").value("NO_MATCH"))
                .andExpect(jsonPath("$.scanId").doesNotExist());

        ArgumentCaptor<ScanWineLabelCommand> command = ArgumentCaptor.forClass(ScanWineLabelCommand.class);
        verify(scan).execute(command.capture());
        assertThat(command.getValue().barcode()).isNull();
        assertThat(command.getValue().observedText()).containsExactly("MALBEC");
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "1234567", "123456789", "12345678901", "123456789012345", "77912345678a0", "7791234567890", "12345678",
            " 7791234567890", "７７９１２３４５"})
    void anyOtherBarcodeIsRejected(String barcode) throws Exception {
        mvc.perform(multipart("/wines/scan").file(image()).param("barcode", barcode))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_LABEL_BARCODE"));
        verifyNoInteractions(scan);
    }

    @Test
    void feedbackOnAScanAnswersNoContent() throws Exception {
        UUID scanId = UUID.randomUUID();
        UUID wine = UUID.randomUUID();

        mvc.perform(post("/wines/scans/{scanId}/feedback", scanId).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"verdict\":\"CORRECTED\",\"wineId\":\"" + wine + "\"}"))
                .andExpect(status().isNoContent());

        verify(feedback).execute(new SubmitWineLabelScanFeedbackCommand(
                member, scanId, WineLabelScanVerdict.CORRECTED, wine));
    }

    @Test
    void notInCatalogFeedbackNeedsNoWine() throws Exception {
        UUID scanId = UUID.randomUUID();

        mvc.perform(post("/wines/scans/{scanId}/feedback", scanId).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"verdict\":\"NOT_IN_CATALOG\",\"wineId\":null}"))
                .andExpect(status().isNoContent());

        verify(feedback).execute(new SubmitWineLabelScanFeedbackCommand(
                member, scanId, WineLabelScanVerdict.NOT_IN_CATALOG, null));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "{\"verdict\":\"CONFIRMED\",\"wineId\":null}",
            "{\"verdict\":\"CORRECTED\"}",
            "{\"verdict\":\"NOT_IN_CATALOG\",\"wineId\":\"00000000-0000-0000-0000-000000000001\"}",
            "{\"verdict\":\"MAYBE\",\"wineId\":null}",
            "{\"wineId\":\"00000000-0000-0000-0000-000000000001\"}"})
    void inconsistentFeedbackIsRejected(String body) throws Exception {
        mvc.perform(post("/wines/scans/{scanId}/feedback", UUID.randomUUID()).contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_SCAN_FEEDBACK"));
        verifyNoInteractions(feedback);
    }

    @Test
    void feedbackOnAnUnknownScanOrWineAnswersNotFound() throws Exception {
        doThrow(WineLabelScanFeedbackNotFoundException.scan())
                .doThrow(WineLabelScanFeedbackNotFoundException.wine())
                .when(feedback).execute(any());
        String body = "{\"verdict\":\"CONFIRMED\",\"wineId\":\"" + UUID.randomUUID() + "\"}";

        mvc.perform(post("/wines/scans/{scanId}/feedback", UUID.randomUUID()).contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("SCAN_NOT_FOUND"));
        mvc.perform(post("/wines/scans/{scanId}/feedback", UUID.randomUUID()).contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("WINE_NOT_FOUND"));
    }

    private MockMultipartFile image() {
        return new MockMultipartFile("image", "label.png", "image/png", labelImage);
    }

    private HandlerMethodArgumentResolver principalResolver() {
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
                return member.toString();
            }
        };
    }

    private static byte[] validLabelImage() throws Exception {
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
