package com.vinnot.shared.infrastructure.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Value("${app.uploads.avatar-dir:uploads/avatars}")
    private String avatarDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String absolutePath = Paths.get(avatarDir).toAbsolutePath().normalize().toUri().toString();
        registry.addResourceHandler("/uploads/avatars/**")
                .addResourceLocations(absolutePath);
    }
}

