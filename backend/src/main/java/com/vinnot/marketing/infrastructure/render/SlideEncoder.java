package com.vinnot.marketing.infrastructure.render;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;

/** Turns a finished slide canvas into the bytes that are stored and published. */
@FunctionalInterface
interface SlideEncoder {

    byte[] encode(BufferedImage image) throws IOException;

    /** Baseline JPEG from the JDK writer; an opaque {@code TYPE_INT_RGB} canvas is written as sRGB JFIF. */
    static SlideEncoder jpeg(float quality) {
        return image -> {
            Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpeg");
            if (!writers.hasNext()) {
                throw new IOException("No JPEG encoder is available");
            }
            ImageWriter writer = writers.next();
            ByteArrayOutputStream bytes = new ByteArrayOutputStream(512 * 1024);
            try (ImageOutputStream output = ImageIO.createImageOutputStream(bytes)) {
                writer.setOutput(output);
                ImageWriteParam params = writer.getDefaultWriteParam();
                params.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                params.setCompressionQuality(quality);
                writer.write(null, new IIOImage(image, null, null), params);
            } finally {
                writer.dispose();
            }
            return bytes.toByteArray();
        };
    }
}
