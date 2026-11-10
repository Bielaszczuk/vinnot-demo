package com.vinnot.marketing.application.service;

import com.vinnot.marketing.domain.model.ContentPillar;
import com.vinnot.marketing.domain.model.PostCopies;
import com.vinnot.marketing.domain.model.PostCopy;
import com.vinnot.marketing.domain.model.PostLanguage;
import com.vinnot.marketing.domain.model.WineDay;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

/**
 * The deterministic copy of mock mode (#489): valid, recognisable as simulated, the same for the same post, and written in
 * neutral Spanish ("tú") and in English without regional terms (#497).
 */
@Service
public class MockSocialCopy {
    private static final List<String> HASHTAGS_ES = List.of("#vinnot", "#vino", "#cata", "#enologia", "#copa");
    private static final List<String> HASHTAGS_EN = List.of("#vinnot", "#wine", "#winetasting", "#oenology", "#winelover");

    public PostCopies write(ContentPillar pillar, WineDay wineDay, LocalDate date) {
        boolean feature = ContentPillar.APP_FEATURE.equals(pillar.code());
        String illustration = "a simulated still life for " + (Objects.isNull(wineDay) ? pillar.nameEn() : wineDay.nameEn())
                + ": a wine glass and a bunch of grapes";
        String topicEs = Objects.isNull(wineDay) ? pillar.nameEs() : wineDay.nameEs();
        PostCopy es = PostCopy.of(PostLanguage.ES,
                Objects.isNull(wineDay) ? pillar.nameEs() + " de la semana" : "Hoy es el " + wineDay.nameEs(),
                List.of(new PostCopy.Slide("Copia simulada", "Pilar: " + pillar.nameEs() + "."), new PostCopy.Slide("Tema", topicEs + "."),
                        new PostCopy.Slide("Fecha", "Se publica el " + date + ".")),
                "Copia simulada de Vinnot para " + topicEs + " (" + pillar.nameEs() + "), programada para el " + date + ".", HASHTAGS_ES,
                "Ilustración de una copa de vino sobre fondo color vino",
                feature ? "Regístrate en vinnot.com/share y guarda tu primer vino. ¿Cuál sería?"
                        : "¿Qué vino abrirías hoy? Cuéntanos en los comentarios.", illustration);
        String topicEn = Objects.isNull(wineDay) ? pillar.nameEn() : wineDay.nameEn();
        PostCopy en = PostCopy.of(PostLanguage.EN,
                Objects.isNull(wineDay) ? pillar.nameEn() + " of the week" : "Today is " + wineDay.nameEn(),
                List.of(new PostCopy.Slide("Simulated copy", "Pillar: " + pillar.nameEn() + "."), new PostCopy.Slide("Topic", topicEn + "."),
                        new PostCopy.Slide("Date", "Published on " + date + ".")),
                "Simulated Vinnot copy for " + topicEn + " (" + pillar.nameEn() + "), scheduled for " + date + ".", HASHTAGS_EN,
                "Illustration of a wine glass on a burgundy background",
                feature ? "Sign up at vinnot.com/share and save your first wine. Which one would it be?"
                        : "Which wine would you open today? Tell us in the comments.", illustration);
        return new PostCopies(es, en);
    }
}
