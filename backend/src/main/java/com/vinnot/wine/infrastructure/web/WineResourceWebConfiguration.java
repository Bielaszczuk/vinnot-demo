package com.vinnot.wine.infrastructure.web;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@RequiredArgsConstructor
public class WineResourceWebConfiguration implements WebMvcConfigurer {
    private final WineResourceAccessInterceptor interceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(interceptor).addPathPatterns(
                "/wines/*/ai-profile/**", "/wines/*/reviews/**", "/wines/*/similar", "/wines/*/label-image");
    }
}
