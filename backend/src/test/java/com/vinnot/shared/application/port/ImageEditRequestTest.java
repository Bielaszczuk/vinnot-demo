package com.vinnot.shared.application.port;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ImageEditRequestTest {

    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n', 0};

    @Test
    void acceptsAValidRequestAndCopiesItsReferences() {
        var references = new ArrayList<>(List.of(new ReferenceImage("cellar.png", PNG)));
        var request = new ImageEditRequest("Paint a vineyard", references, null, true);
        references.clear();

        assertThat(request.references()).hasSize(1);
        assertThat(request.size()).isNull();
        assertThatThrownBy(() -> request.references().add(new ReferenceImage("x.png", PNG)))
                .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    void rejectsBlankOrOversizedPrompts() {
        var references = List.of(new ReferenceImage("a.png", PNG));
        assertThatThrownBy(() -> new ImageEditRequest(" ", references, null, true))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new ImageEditRequest(null, references, null, true))
                .isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> new ImageEditRequest("x".repeat(ImageEditRequest.MAX_PROMPT_LENGTH + 1),
                references, null, true)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void requiresBetweenOneAndSixteenReferences() {
        assertThatThrownBy(() -> new ImageEditRequest("p", List.of(), null, true))
                .isInstanceOf(IllegalArgumentException.class);
        var seventeen = Collections.nCopies(17, new ReferenceImage("a.png", PNG));
        assertThatThrownBy(() -> new ImageEditRequest("p", seventeen, null, true))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(new ImageEditRequest("p", Collections.nCopies(16, new ReferenceImage("a.png", PNG)), null, true)
                .references()).hasSize(16);
    }

    @Test
    void rejectsReferencesOverTheTotalByteLimit() {
        byte[] large = Arrays.copyOf(PNG, (int) (ImageEditRequest.MAX_TOTAL_REFERENCE_BYTES / 2) + 1);
        var references = List.of(new ReferenceImage("a.png", large), new ReferenceImage("b.png", large));
        assertThatThrownBy(() -> new ImageEditRequest("p", references, null, true))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void acceptsOnlySupportedSizes() {
        var references = List.of(new ReferenceImage("a.png", PNG));
        assertThat(new ImageEditRequest("p", references, "1024x1536", false).size()).isEqualTo("1024x1536");
        assertThatThrownBy(() -> new ImageEditRequest("p", references, "1080x1350", false))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"../secret.png", "a\r\nX-Injected: 1.png", "image.jpg", ".png", "a b.png", "a\".png"})
    void referenceNamesMustBePlainPngFileNames(String name) {
        assertThatThrownBy(() -> new ReferenceImage(name, PNG)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void referenceBytesMustBeAPngAndAreCopied() {
        assertThatThrownBy(() -> new ReferenceImage("a.png", "GIF89a".getBytes()))
                .isInstanceOf(IllegalArgumentException.class);
        byte[] source = PNG.clone();
        var reference = new ReferenceImage("a.png", source);
        source[8] = 7;
        reference.png()[8] = 9;
        assertThat(reference.png()[8]).isZero();
        assertThat(reference.size()).isEqualTo(PNG.length);
    }

    @Test
    void generatedImageCopiesItsBytesAndRequiresContent() {
        byte[] source = {1, 2, 3};
        var image = new GeneratedImage(source, "gpt-image-1");
        source[0] = 9;
        image.png()[1] = 9;
        assertThat(image.png()).containsExactly(1, 2, 3);
        assertThatThrownBy(() -> new GeneratedImage(new byte[0], "gpt-image-1"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new GeneratedImage(source, " ")).isInstanceOf(IllegalArgumentException.class);
    }
}
