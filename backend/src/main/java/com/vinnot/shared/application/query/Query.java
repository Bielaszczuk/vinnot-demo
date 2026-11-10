package com.vinnot.shared.application.query;

/**
 * Marker interface for all queries in the system.
 * Queries request data without modifying system state.
 *
 * @param <Result> the result type returned by the query handler
 */
public interface Query<Result> {
}
