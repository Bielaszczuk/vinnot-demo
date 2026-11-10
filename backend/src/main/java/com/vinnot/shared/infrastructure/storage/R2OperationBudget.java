package com.vinnot.shared.infrastructure.storage;

import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.YearMonth;

/** Reservations commit before I/O and are never refunded on ambiguous failures or database rollbacks. */
@Component
public class R2OperationBudget {
    private static final long MAX_STORAGE_BYTES = 1_073_741_824L;
    private static final long MAX_WRITES = 50_000L;
    private static final long MAX_READS = 500_000L;
    private static final long DEFAULT_SOCIAL_MONTHLY_BYTES = 1_073_741_824L;
    private static final long MAX_SOCIAL_MONTHLY_BYTES = 4L * 1_073_741_824L;
    private final JdbcTemplate jdbc;
    private final long storageBytes;
    private final long writes;
    private final long reads;
    private final boolean writesEnabled;
    private final long socialMonthlyBytes;

    public R2OperationBudget(JdbcTemplate jdbc, long storageBytes, long writes, long reads, boolean writesEnabled) {
        this(jdbc, storageBytes, writes, reads, writesEnabled, DEFAULT_SOCIAL_MONTHLY_BYTES);
    }

    @Autowired
    public R2OperationBudget(JdbcTemplate jdbc,
            @Value("${app.storage.r2.max-reserved-bytes:536870912}") long storageBytes,
            @Value("${app.storage.r2.max-monthly-writes:5000}") long writes,
            @Value("${app.storage.r2.max-monthly-reads:100000}") long reads,
            @Value("${app.storage.r2.writes-enabled:true}") boolean writesEnabled,
            @Value("${app.storage.r2.social-max-monthly-bytes:1073741824}") long socialMonthlyBytes) {
        if (storageBytes <= 0 || storageBytes > MAX_STORAGE_BYTES || writes <= 0 || writes > MAX_WRITES || reads <= 0 || reads > MAX_READS
                || socialMonthlyBytes <= 0 || socialMonthlyBytes > MAX_SOCIAL_MONTHLY_BYTES) {
            throw new IllegalArgumentException("R2 allocations exceed conservative environment limits");
        }
        this.jdbc = jdbc;
        this.storageBytes = storageBytes;
        this.writes = writes;
        this.reads = reads;
        this.writesEnabled = writesEnabled;
        this.socialMonthlyBytes = socialMonthlyBytes;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void reserveWrite(long bytes) {
        requireWritesEnabled();
        reserve("r2-storage", "lifetime", 0, bytes, Long.MAX_VALUE, storageBytes);
        reserve("r2-write", month(), 1, 0, writes, Long.MAX_VALUE);
    }

    /**
     * Rendered social media is replaced on every copy edit and its old objects are deleted, so it reserves a monthly
     * byte allowance of its own instead of the lifetime allowance that user uploads depend on. Each object still
     * counts against the shared monthly write operations.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void reserveSocialWrite(long bytes) {
        requireWritesEnabled();
        reserve("r2-social-bytes", month(), 0, bytes, Long.MAX_VALUE, socialMonthlyBytes);
        reserve("r2-write", month(), 1, 0, writes, Long.MAX_VALUE);
    }

    private void requireWritesEnabled() {
        if (!writesEnabled) {
            throw new ExternalServiceUnavailableException("IMAGE_STORAGE_READ_ONLY", "Image uploads are temporarily disabled.", null);
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void reserveRead() { reserve("r2-read", month(), 1, 0, reads, Long.MAX_VALUE); }

    private String month() { return YearMonth.from(LocalDate.now(ZoneOffset.UTC)).toString(); }

    private void reserve(String scope, String period, long operations, long bytes, long maxOperations, long maxBytes) {
        int changed = jdbc.update("""
                INSERT INTO storage_operation_budgets(scope, period, operations, bytes_reserved)
                SELECT ?, ?, ?, ? WHERE ? <= ? AND ? <= ?
                ON CONFLICT(scope, period) DO UPDATE SET
                  operations = storage_operation_budgets.operations + EXCLUDED.operations,
                  bytes_reserved = storage_operation_budgets.bytes_reserved + EXCLUDED.bytes_reserved
                WHERE storage_operation_budgets.operations <= ? - EXCLUDED.operations
                  AND storage_operation_budgets.bytes_reserved <= ? - EXCLUDED.bytes_reserved
                """, scope, period, operations, bytes, operations, maxOperations, bytes, maxBytes, maxOperations, maxBytes);
        if (changed != 1) {
            throw new ExternalServiceUnavailableException("IMAGE_STORAGE_LIMIT", "Image storage limit reached. Please try again later.", null);
        }
    }
}
