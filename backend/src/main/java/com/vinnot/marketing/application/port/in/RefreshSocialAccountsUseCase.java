package com.vinnot.marketing.application.port.in;

/** Refreshes the connected accounts whose tokens are about to expire (#510 S5). */
public interface RefreshSocialAccountsUseCase {

    /** The number of accounts refreshed. */
    int refreshDue();
}
