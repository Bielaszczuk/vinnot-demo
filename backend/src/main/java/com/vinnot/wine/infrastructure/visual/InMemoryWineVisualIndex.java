package com.vinnot.wine.infrastructure.visual;

import com.vinnot.wine.application.port.out.WineVisualIndexPort;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.PriorityQueue;
import java.util.UUID;
import java.util.concurrent.locks.ReentrantReadWriteLock;

/**
 * Brute-force cosine index over every catalog label vector, kept in memory as signed bytes (one per dimension)
 * plus one scale per vector. 35k wines at 768 dimensions take about 27 MB and a full comparison takes a few
 * milliseconds, so no approximate structure is needed. Vectors are normalized before quantization, so the
 * similarity of two vectors is scale × query scale × the dot product of their bytes.
 */
public class InMemoryWineVisualIndex implements WineVisualIndexPort {

    private static final int INITIAL_CAPACITY = 1024;

    private final int dimensions;
    private final ReentrantReadWriteLock lock = new ReentrantReadWriteLock();
    private final Map<UUID, Integer> rows = new HashMap<>();
    private UUID[] wineIds = new UUID[INITIAL_CAPACITY];
    private float[] scales = new float[INITIAL_CAPACITY];
    private byte[] vectors;
    private int size;

    public InMemoryWineVisualIndex(int dimensions) {
        if (dimensions < 1) {
            throw new IllegalArgumentException("dimensions must be positive");
        }
        this.dimensions = dimensions;
        this.vectors = new byte[INITIAL_CAPACITY * dimensions];
    }

    @Override
    public void put(UUID wineId, float[] vector) {
        Objects.requireNonNull(wineId, "wineId");
        Int8Vectors.Quantized quantized = quantize(vector);
        lock.writeLock().lock();
        try {
            Integer existing = rows.get(wineId);
            int row = Objects.nonNull(existing) ? existing : append(wineId);
            scales[row] = quantized.scale();
            System.arraycopy(quantized.values(), 0, vectors, row * dimensions, dimensions);
        } finally {
            lock.writeLock().unlock();
        }
    }

    @Override
    public void remove(UUID wineId) {
        lock.writeLock().lock();
        try {
            Integer row = rows.remove(wineId);
            if (Objects.isNull(row)) {
                return;
            }
            int last = size - 1;
            if (row != last) {
                wineIds[row] = wineIds[last];
                scales[row] = scales[last];
                System.arraycopy(vectors, last * dimensions, vectors, row * dimensions, dimensions);
                rows.put(wineIds[row], row);
            }
            wineIds[last] = null;
            size = last;
        } finally {
            lock.writeLock().unlock();
        }
    }

    @Override
    public int size() {
        lock.readLock().lock();
        try {
            return size;
        } finally {
            lock.readLock().unlock();
        }
    }

    @Override
    public List<VisualMatch> nearest(float[] query, int limit) {
        if (limit < 1) {
            return List.of();
        }
        Int8Vectors.Quantized quantized = quantize(query);
        byte[] q = quantized.values();
        PriorityQueue<VisualMatch> best = new PriorityQueue<>(Comparator.comparingDouble(VisualMatch::similarity));
        lock.readLock().lock();
        try {
            for (int row = 0; row < size; row++) {
                int offset = row * dimensions;
                long dot = 0;
                for (int d = 0; d < dimensions; d++) {
                    dot += q[d] * vectors[offset + d];
                }
                double similarity = dot * (double) scales[row] * quantized.scale();
                if (best.size() < limit) {
                    best.add(new VisualMatch(wineIds[row], similarity));
                } else if (similarity > best.peek().similarity()) {
                    best.poll();
                    best.add(new VisualMatch(wineIds[row], similarity));
                }
            }
        } finally {
            lock.readLock().unlock();
        }
        List<VisualMatch> ordered = new ArrayList<>(best);
        ordered.sort(Comparator.comparingDouble(VisualMatch::similarity).reversed()
                .thenComparing(match -> match.wineId().toString()));
        return List.copyOf(ordered);
    }

    private int append(UUID wineId) {
        if (size == wineIds.length) {
            int capacity = wineIds.length * 2;
            wineIds = Arrays.copyOf(wineIds, capacity);
            scales = Arrays.copyOf(scales, capacity);
            vectors = Arrays.copyOf(vectors, capacity * dimensions);
        }
        wineIds[size] = wineId;
        rows.put(wineId, size);
        return size++;
    }

    private Int8Vectors.Quantized quantize(float[] vector) {
        return Int8Vectors.quantize(vector, dimensions);
    }
}
