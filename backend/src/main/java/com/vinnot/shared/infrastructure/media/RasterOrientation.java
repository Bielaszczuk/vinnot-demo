package com.vinnot.shared.infrastructure.media;

import java.awt.image.BufferedImage;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;

/** Inspects bounded metadata containers only; no source metadata is copied to the output. */
public final class RasterOrientation {
    private static final int JPEG_START = 0xd8;
    private static final int JPEG_SCAN = 0xda;
    private static final int JPEG_END = 0xd9;
    private static final int JPEG_EXIF = 0xe1;
    private static final int EXIF_HEADER = 6;
    private static final int TIFF_MAGIC = 42;
    private static final int TIFF_ENTRY_SIZE = 12;
    private static final int ORIENTATION_TAG = 274;
    private static final int TIFF_SHORT = 3;
    private static final int TIFF_VALUE_OFFSET = 8;
    private static final int PNG_HEADER = 8;
    private static final int CHUNK_HEADER = 8;
    private static final int PNG_CHUNK_OVERHEAD = 12;
    private static final int RIFF_HEADER = 12;
    private static final int ROTATE_180 = 3;
    private static final int MIRROR_VERTICAL = 4;
    private static final int TRANSPOSE = 5;
    private static final int ROTATE_90 = 6;
    private static final int TRANSVERSE = 7;
    private static final int ROTATE_270 = 8;

    private RasterOrientation() { }

    public static int read(byte[] bytes) {
        if (bytes.length >= 2 && Byte.toUnsignedInt(bytes[0]) == 255 && Byte.toUnsignedInt(bytes[1]) == JPEG_START) {
            return jpeg(bytes);
        }
        if (matches(bytes, 0, "\u0089PNG\r\n\u001a\n")) { return chunks(bytes, PNG_HEADER, false); }
        if (matches(bytes, 0, "RIFF") && matches(bytes, CHUNK_HEADER, "WEBP")) { return chunks(bytes, RIFF_HEADER, true); }
        return 1;
    }

    private static int jpeg(byte[] bytes) {
        int offset = 2;
        while (offset + 4 <= bytes.length && Byte.toUnsignedInt(bytes[offset]) == 255) {
            int marker = Byte.toUnsignedInt(bytes[offset + 1]);
            if (marker == JPEG_SCAN || marker == JPEG_END) { break; }
            int length = Short.toUnsignedInt(ByteBuffer.wrap(bytes).getShort(offset + 2));
            if (length < 2 || length > bytes.length - offset - 2) { break; }
            int payload = offset + 4;
            if (marker == JPEG_EXIF && matches(bytes, payload, "Exif\0\0")) {
                return tiff(bytes, payload + EXIF_HEADER, length - 2 - EXIF_HEADER);
            }
            offset += 2 + length;
        }
        return 1;
    }

    private static int chunks(byte[] bytes, int start, boolean webp) {
        ByteBuffer buffer = ByteBuffer.wrap(bytes).order(webp ? ByteOrder.LITTLE_ENDIAN : ByteOrder.BIG_ENDIAN);
        int offset = start;
        while (offset <= bytes.length - CHUNK_HEADER) {
            long length = Integer.toUnsignedLong(buffer.getInt(webp ? offset + 4 : offset));
            int overhead = webp ? CHUNK_HEADER : PNG_CHUNK_OVERHEAD;
            if (length > bytes.length - offset - overhead) { break; }
            if (matches(bytes, webp ? offset : offset + 4, webp ? "EXIF" : "eXIf")) {
                int payload = offset + CHUNK_HEADER;
                int skip = matches(bytes, payload, "Exif\0\0") ? EXIF_HEADER : 0;
                return tiff(bytes, payload + skip, (int) length - skip);
            }
            offset += overhead + (int) length + (webp ? (int) (length % 2) : 0);
        }
        return 1;
    }

    private static boolean matches(byte[] bytes, int offset, String value) {
        if (offset < 0 || offset > bytes.length - value.length()) { return false; }
        for (int i = 0; i < value.length(); i++) {
            if (Byte.toUnsignedInt(bytes[offset + i]) != value.charAt(i)) { return false; }
        }
        return true;
    }

    private static int tiff(byte[] bytes, int start, int length) {
        if (length < TIFF_VALUE_OFFSET || start < 0 || length > bytes.length - start) { return 1; }
        try {
            ByteBuffer data = ByteBuffer.wrap(bytes, start, length).slice();
            if (data.get(0) == 'I' && data.get(1) == 'I') { data.order(ByteOrder.LITTLE_ENDIAN); }
            else if (data.get(0) != 'M' || data.get(1) != 'M') { return 1; }
            if (Short.toUnsignedInt(data.getShort(2)) != TIFF_MAGIC) { return 1; }
            long offset = Integer.toUnsignedLong(data.getInt(4));
            if (offset > data.limit() - 2) { return 1; }
            int entries = Short.toUnsignedInt(data.getShort((int) offset));
            for (int entry = 0; entry < entries; entry++) {
                long position = offset + 2L + entry * (long) TIFF_ENTRY_SIZE;
                if (position > data.limit() - TIFF_ENTRY_SIZE) { return 1; }
                int p = (int) position;
                if (Short.toUnsignedInt(data.getShort(p)) == ORIENTATION_TAG
                        && Short.toUnsignedInt(data.getShort(p + 2)) == TIFF_SHORT && data.getInt(p + 4) == 1) {
                    int value = Short.toUnsignedInt(data.getShort(p + TIFF_VALUE_OFFSET));
                    return value >= 1 && value <= ROTATE_270 ? value : 1;
                }
            }
        } catch (IndexOutOfBoundsException exception) { return 1; }
        return 1;
    }

    public static BufferedImage apply(BufferedImage source, int orientation) {
        if (orientation == 1) { return source; }
        boolean swap = orientation >= TRANSPOSE;
        BufferedImage target = new BufferedImage(swap ? source.getHeight() : source.getWidth(),
                swap ? source.getWidth() : source.getHeight(), BufferedImage.TYPE_INT_ARGB);
        for (int y = 0; y < source.getHeight(); y++) {
            for (int x = 0; x < source.getWidth(); x++) {
                int right = source.getWidth() - 1 - x;
                int bottom = source.getHeight() - 1 - y;
                switch (orientation) {
                    case 2 -> target.setRGB(right, y, source.getRGB(x, y));
                    case ROTATE_180 -> target.setRGB(right, bottom, source.getRGB(x, y));
                    case MIRROR_VERTICAL -> target.setRGB(x, bottom, source.getRGB(x, y));
                    case TRANSPOSE -> target.setRGB(y, x, source.getRGB(x, y));
                    case ROTATE_90 -> target.setRGB(bottom, x, source.getRGB(x, y));
                    case TRANSVERSE -> target.setRGB(bottom, right, source.getRGB(x, y));
                    case ROTATE_270 -> target.setRGB(y, right, source.getRGB(x, y));
                    default -> throw new IllegalArgumentException("Invalid orientation");
                }
            }
        }
        return target;
    }
}
