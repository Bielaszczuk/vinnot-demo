package com.vinnot.marketing.infrastructure.render;

import com.vinnot.shared.application.port.ImageEditRequest;
import com.vinnot.shared.application.port.ReferenceImage;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/** S1: the bundled app illustrations are the style references, within the request's byte limit; broken files are skipped. */
class ClasspathStyleReferenceCatalogTest {

    @Test
    void theBundledIllustrationsLoadAsPngReferencesWithinTheRequestLimit() {
        List<ReferenceImage> references = new ClasspathStyleReferenceCatalog().references();
        assertThat(references).extracting(ReferenceImage::fileName).containsExactly("winery.png", "emptycellar.png", "event.png", "routes.png");
        assertThat(references.stream().mapToLong(ReferenceImage::size).sum()).isLessThan(ImageEditRequest.MAX_TOTAL_REFERENCE_BYTES);
    }

    @Test
    void missingOrBrokenFilesAreSkippedAndTheResultIsLoadedOnce() {
        byte[] png = {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n', 1};
        AtomicInteger opened = new AtomicInteger();
        ClasspathStyleReferenceCatalog catalog = new ClasspathStyleReferenceCatalog(path -> {
            opened.incrementAndGet();
            return switch (path) {
                case "marketing/references/winery.png" -> new ByteArrayInputStream(png);
                case "marketing/references/emptycellar.png" -> new ByteArrayInputStream(new byte[] {1, 2, 3});
                case "marketing/references/event.png" -> failing();
                default -> null;
            };
        });

        assertThat(catalog.references()).extracting(ReferenceImage::fileName).containsExactly("winery.png");
        assertThat(catalog.references()).hasSize(1);
        assertThat(opened).hasValue(4);
    }

    private static InputStream failing() {
        return new InputStream() {
            @Override
            public int read() throws IOException {
                throw new IOException("broken");
            }
        };
    }
}
