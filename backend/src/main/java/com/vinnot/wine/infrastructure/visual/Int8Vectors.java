package com.vinnot.wine.infrastructure.visual;

import java.util.Objects;

/**
 * Normalizes a vector to unit length and stores it as signed bytes plus one scale: value = byte × scale. The
 * largest component maps to ±127, so re-quantizing a restored vector gives back the same bytes.
 */
public final class Int8Vectors {

    private static final double LEVELS = 127.0;

    private Int8Vectors() {
    }

    public static Quantized quantize(float[] vector, int dimensions) {
        if (Objects.isNull(vector) || vector.length != dimensions) {
            throw new IllegalArgumentException("vector must have " + dimensions + " dimensions");
        }
        double norm = 0;
        for (float value : vector) {
            norm += (double) value * value;
        }
        norm = Math.sqrt(norm);
        if (norm == 0 || Double.isNaN(norm) || Double.isInfinite(norm)) {
            throw new IllegalArgumentException("vector must be finite and not zero");
        }
        double max = 0;
        for (float value : vector) {
            max = Math.max(max, Math.abs(value / norm));
        }
        double scale = max / LEVELS;
        byte[] values = new byte[dimensions];
        for (int d = 0; d < dimensions; d++) {
            values[d] = (byte) Math.round(vector[d] / norm / scale);
        }
        return new Quantized(values, (float) scale);
    }

    public static float[] restore(byte[] values, float scale) {
        float[] vector = new float[values.length];
        for (int d = 0; d < values.length; d++) {
            vector[d] = values[d] * scale;
        }
        return vector;
    }

    public record Quantized(byte[] values, float scale) {
    }
}
