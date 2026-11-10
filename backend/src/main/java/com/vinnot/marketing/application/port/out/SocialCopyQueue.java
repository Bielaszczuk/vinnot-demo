package com.vinnot.marketing.application.port.out;

import com.vinnot.marketing.application.model.PlannedBatch;

/**
 * Hands a planned batch to a background job that writes its copy (#489). Writing takes one to three AI calls per
 * post, longer than an HTTP request may wait at the edge, so planning returns once the drafts are stored.
 */
public interface SocialCopyQueue {
    void enqueue(PlannedBatch batch);
}
