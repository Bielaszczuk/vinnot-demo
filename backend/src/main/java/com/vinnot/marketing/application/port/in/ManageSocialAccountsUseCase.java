package com.vinnot.marketing.application.port.in;

import com.vinnot.marketing.application.model.SocialAccountDisconnectResult;
import com.vinnot.marketing.application.model.SocialAccountResponse;
import com.vinnot.marketing.domain.model.SocialNetwork;

import java.util.List;
import java.util.UUID;

/** The network connections on the admin page (#510 S5 C5). */
public interface ManageSocialAccountsUseCase {

    /** Every network's connection, in network order, never with a token. */
    List<SocialAccountResponse> list();

    /** The OAuth consent URL to connect Threads or TikTok, with a state bound to the admin and the network. */
    String connectUrl(SocialNetwork network, UUID adminId);

    /**
     * Completes the OAuth redirect: checks the state, exchanges the code and stores the account. False on any failure
     * (bad or used state, the network's error, a failed exchange); nothing secret is returned.
     */
    boolean completeConnection(SocialNetwork network, String code, String state, String error);

    /** Removes a stored OAuth account. */
    SocialAccountDisconnectResult disconnect(SocialNetwork network);
}
