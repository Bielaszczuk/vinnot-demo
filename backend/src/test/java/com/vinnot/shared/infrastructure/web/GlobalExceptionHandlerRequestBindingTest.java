package com.vinnot.shared.infrastructure.web;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class GlobalExceptionHandlerRequestBindingTest {

    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new BindingController())
            .setControllerAdvice(new GlobalExceptionHandler()).build();

    @Test
    void answersBadRequestWhenARequiredQueryParameterIsMissing() throws Exception {
        mvc.perform(get("/binding/param"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    void answersBadRequestWhenARequiredMultipartPartIsMissing() throws Exception {
        mvc.perform(multipart("/binding/part").param("other", "value"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    void keepsAnsweringWhenTheRequiredParameterIsPresent() throws Exception {
        mvc.perform(get("/binding/param").param("token", "abc").accept(MediaType.TEXT_PLAIN))
                .andExpect(status().isOk());
    }

    @RestController
    static class BindingController {

        @GetMapping("/binding/param")
        String param(@RequestParam String token) {
            return token;
        }

        @PostMapping("/binding/part")
        String part(@RequestPart("file") MultipartFile file) {
            return file.getName();
        }
    }
}
