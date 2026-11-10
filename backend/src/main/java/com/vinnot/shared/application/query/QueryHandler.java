package com.vinnot.shared.application.query;

/**
 * Interface for query handlers.
 * Handlers process queries and return results without side effects.
 *
 * @param <QueryType> the query type
 * @param <Result> the result type
 */
public interface QueryHandler<QueryType extends Query<Result>, Result> {

    /**
     * Handles the given query.
     *
     * @param query the query to handle
     * @return the query result
     */
    Result handle(QueryType query);
}
