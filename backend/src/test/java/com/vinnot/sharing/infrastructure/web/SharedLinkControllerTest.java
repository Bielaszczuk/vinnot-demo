package com.vinnot.sharing.infrastructure.web;

import com.vinnot.sharing.application.port.in.GetSharedContentUseCase;
import com.vinnot.sharing.domain.SharedContent;
import com.vinnot.sharing.domain.SharedContentKind;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.util.Optional;
import java.util.UUID;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;

class SharedLinkControllerTest {
    private final GetSharedContentUseCase content = mock(GetSharedContentUseCase.class);
    private final UUID id = UUID.fromString("758a7f04-2678-4b92-8f5a-00272d150318");
    private MockMvc mvc;
    @BeforeEach void setup() throws Exception {
        mvc = MockMvcBuilders.standaloneSetup(new SharedLinkController(content,
                new SharedLinkHtmlRenderer("https://vinnot.com", "https://api.vinnot.com", false))).build();
    }
    @Test void rendersPublicMetadataAndSpecificDestinationsBeforeJavascriptRuns() throws Exception {
        when(content.execute(SharedContentKind.WINES, id, false)).thenReturn(Optional.of(
                new SharedContent("Mural Tinto", "Discover this wine", "https://images.vinnot.com/wines/ar/label.webp")));
        mvc.perform(get("/share/wines/" + id)).andExpect(status().isOk())
                .andExpect(content().contentType("text/html;charset=UTF-8"))
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(content().string(containsString("property=\"og:title\" content=\"Mural Tinto · Vinnot\"")))
                .andExpect(content().string(containsString("href=\"vinnot://wines/" + id + "\"")))
                .andExpect(content().string(containsString("href=\"https://vinnot.com/wines/" + id + "\"")))
                .andExpect(content().string(containsString("type=\"module\" src=\"https://vinnot.com/share-assets/landing-downloads.js\"")))
                .andExpect(header().string("Content-Security-Policy", containsString("script-src 'self'")));
        verify(content, times(1)).execute(SharedContentKind.WINES, id, false);
    }
    @Test void missingAndUnpublishedItemsDoNotRevealTheirMetadata() throws Exception {
        when(content.execute(any(), any(), anyBoolean())).thenReturn(Optional.empty());
        mvc.perform(get("/share/events/" + id)).andExpect(status().isNotFound())
                .andExpect(content().string(containsString("Este enlace ya no está disponible")))
                .andExpect(content().string(not(containsString("vinnot://events/"))));
    }
    @Test void malformedIdsAndUnknownResourcesNeverReachPersistence() throws Exception {
        for (String path : new String[]{"/share/wines/nope", "/share/admin/" + id, "/share/wines/1-2-3-4-5"}) {
            mvc.perform(get(path)).andExpect(status().isNotFound());
        }
        verifyNoInteractions(content);
    }
    @Test void headIsSupportedAndEnglishIsExplicit() throws Exception {
        when(content.execute(SharedContentKind.ROUTES, id, true)).thenReturn(Optional.of(new SharedContent("Trevelin", "Explore", null)));
        mvc.perform(head("/share/wine-routes/" + id).param("lang", "en"))
                .andExpect(status().isOk()).andExpect(header().string("Content-Type", "text/html;charset=UTF-8"));
        mvc.perform(get("/share/wine-routes/" + id).param("lang", "en"))
                .andExpect(content().string(containsString("Open in Vinnot")))
                .andExpect(content().string(containsString("lang=\"en\"")));
        mvc.perform(get("/share/wine-routes/" + id + "/en"))
                .andExpect(content().string(containsString("Open in Vinnot")))
                .andExpect(content().string(containsString("href=\"https://vinnot.com/share/wine-routes/" + id + "\"")));
        mvc.perform(head("/share/wine-routes/" + id + "/en")).andExpect(status().isOk());
    }
    @Test void appLandingHasRealAppStoreAndAndroidAvailability() throws Exception {
        mvc.perform(get("/share")).andExpect(status().isOk())
                .andExpect(content().string(containsString("id6817992780")))
                .andExpect(content().string(containsString("<title>Vinnot · El mundo del vino, a tu manera</title>")))
                .andExpect(content().string(containsString("Próximamente en Google Play")));
        mvc.perform(get("/share/en")).andExpect(status().isOk())
                .andExpect(content().string(containsString("<title>Vinnot · The world of wine, your way</title>")))
                .andExpect(content().string(containsString("Coming soon on Google Play")));
        verifyNoInteractions(content);
    }
}
