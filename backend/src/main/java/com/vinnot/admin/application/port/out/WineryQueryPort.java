package com.vinnot.admin.application.port.out;

public interface WineryQueryPort {

    /**
     * Counts total wineries.
     *
     * @return the total count
     */
    long count();
}
