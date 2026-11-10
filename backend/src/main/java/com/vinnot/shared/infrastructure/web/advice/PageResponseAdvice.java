package com.vinnot.shared.infrastructure.web.advice;

import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.shared.infrastructure.web.dto.PageResponseWrapper;
import org.springframework.core.MethodParameter;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

/**
 * Automatically wraps Spring Data {@link Page} responses into
 * {@link PageResponseWrapper} format matching the frontend pagination contract.
 *
 * <p>This avoids having to change every controller manually.
 * Any controller returning {@code ResponseEntity<Page<T>>} will have its body
 * transformed to the frontend-compatible format with fields:
 * items, content, pageNumber, pageSize, totalItems, totalPages,
 * first, last, hasNext, hasPrevious, empty.</p>
 */
@ControllerAdvice
public class PageResponseAdvice implements ResponseBodyAdvice<Object> {

    @Override
    public boolean supports(MethodParameter returnType,
                              Class<? extends HttpMessageConverter<?>> converterType) {
        return true;
    }

    @Override
    @SuppressWarnings("unchecked")
    public Object beforeBodyWrite(Object body,
                                    MethodParameter returnType,
                                    MediaType selectedContentType,
                                    Class<? extends HttpMessageConverter<?>> selectedConverterType,
                                    ServerHttpRequest request,
                                    ServerHttpResponse response) {
        if (body instanceof Page<?> page) {
            return PageResponseWrapper.from(page);
        }
        if (body instanceof PageResult<?> pageResult) {
            return PageResponseWrapper.from(pageResult);
        }
        return body;
    }
}

