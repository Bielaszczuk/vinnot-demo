package com.vinnot.marketing.domain.service;

import com.vinnot.marketing.domain.model.PostCopy;
import com.vinnot.marketing.domain.model.PostLanguage;
import com.vinnot.marketing.domain.model.SocialNetwork;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

/** #510 S4: each network's caption, its limits and how it is shortened. */
class NetworkCaptionFormatterTest {
    private static final String LEGAL = PostLanguage.ES.legalLine();
    private static final List<PostCopy.Slide> SLIDES = List.of(new PostCopy.Slide("Suave", "Taninos redondos."),
            new PostCopy.Slide("Origen", "Burdeos."), new PostCopy.Slide("Hoy", "Brinda."));
    private static final List<String> TAGS = List.of("#vinnot", "#merlot", "#vino", "#tinto", "#copa");
    private static final PostCopy COPY = PostCopy.of(PostLanguage.ES, "Merlot, el tinto amable", SLIDES, "Hoy es el día del Merlot.", TAGS,
            "Copa de vino tinto", "¿Cuál fue tu primer Merlot?");
    private final NetworkCaptionFormatter formatter = new NetworkCaptionFormatter();

    @Test
    void instagramAndFacebookPublishTheCaptionWithItsLegalLineAndPassTheHashtagsApart() {
        String expected = "Hoy es el día del Merlot.\n\n" + LEGAL;
        for (SocialNetwork network : List.of(SocialNetwork.INSTAGRAM, SocialNetwork.FACEBOOK)) {
            NetworkCaptionFormatter.Caption caption = formatter.format(network, COPY, PostLanguage.ES);

            assertThat(caption.text()).as(network.name()).isEqualTo(expected);
            assertThat(caption.hashtags()).isEqualTo(TAGS);
            assertThat(caption.title()).isNull();
            assertThat(caption.topicTag()).isNull();
        }
    }

    @Test
    void theFeedKeepsAtMostThirtyHashtags() {
        List<String> many = IntStream.rangeClosed(1, 35).mapToObj(index -> "#tag" + index).toList();

        NetworkCaptionFormatter.Caption caption = formatter.format(SocialNetwork.INSTAGRAM, copy("Hook", "Texto.", many), PostLanguage.ES);

        assertThat(caption.hashtags()).hasSize(30).containsExactlyElementsOf(many.subList(0, 30));
        assertThat(caption.text()).isEqualTo("Texto.\n\n" + LEGAL);
    }

    @Test
    void aLongFeedCaptionDropsTrailingHashtagsBeforeItsText() {
        String body = words(2_120);

        NetworkCaptionFormatter.Caption caption = formatter.format(SocialNetwork.FACEBOOK, copy("Hook", body, TAGS), PostLanguage.ES);

        assertThat(caption.text()).isEqualTo(body + "\n\n" + LEGAL);
        assertThat(caption.hashtags()).isNotEmpty().hasSizeLessThan(TAGS.size()).containsExactlyElementsOf(TAGS.subList(0,
                caption.hashtags().size()));
        String published = caption.text() + "\n\n" + String.join(" ", caption.hashtags());
        assertThat(published).hasSizeLessThanOrEqualTo(2_200);
        String oneMore = published + " " + TAGS.get(caption.hashtags().size());
        assertThat(oneMore).as("the next hashtag would not fit").hasSizeGreaterThan(2_200);
    }

    @Test
    void aFeedCaptionTooLongWithoutHashtagsIsShortenedOnAWordAndKeepsTheLegalLine() {
        String body = words(3_000);

        NetworkCaptionFormatter.Caption caption = formatter.format(SocialNetwork.INSTAGRAM, copy("Hook", body, TAGS), PostLanguage.ES);

        assertThat(caption.text()).hasSizeLessThanOrEqualTo(2_200).endsWith("…\n\n" + LEGAL);
        assertThat(caption.hashtags()).isEmpty();
        String shortened = caption.text().substring(0, caption.text().indexOf("…"));
        assertThat(body).startsWith(shortened + " ");
    }

    @Test
    void threadsKeepsTheHookTheCaptionAndTheLegalLineWithOneTopicTag() {
        NetworkCaptionFormatter.Caption caption = formatter.format(SocialNetwork.THREADS, COPY, PostLanguage.ES);

        assertThat(caption.text()).isEqualTo("Merlot, el tinto amable\n\nHoy es el día del Merlot.\n\n" + LEGAL);
        assertThat(caption.topicTag()).isEqualTo("merlot");
        assertThat(caption.hashtags()).isEmpty();
        assertThat(caption.title()).isNull();
    }

    @Test
    void aLongThreadsCaptionShortensItsBodyToFiveHundredCharacters() {
        String body = words(900);

        NetworkCaptionFormatter.Caption caption = formatter.format(SocialNetwork.THREADS, copy("Un gancho", body, TAGS), PostLanguage.ES);

        assertThat(caption.text()).hasSizeLessThanOrEqualTo(500).startsWith("Un gancho\n\n").endsWith("…\n\n" + LEGAL);
        String shortened = caption.text().substring("Un gancho\n\n".length(), caption.text().indexOf("…"));
        assertThat(body).startsWith(shortened + " ");
    }

    @Test
    void threadsHasNoTopicTagWhenOnlyTheBrandTagIsThere() {
        List<String> brandOnly = List.of("#Vinnot");

        assertThat(formatter.format(SocialNetwork.THREADS, copy("Hook", "Texto.", brandOnly), PostLanguage.ES).topicTag()).isNull();
    }

    @Test
    void threadsDropsTheBodyWhenTheHookAndTheLegalLineLeaveNoRoom() {
        String hook = "h".repeat(500 - LEGAL.length() - 4);

        NetworkCaptionFormatter.Caption caption = formatter.format(SocialNetwork.THREADS, copy(hook, "Texto largo.", TAGS),
                PostLanguage.ES);

        assertThat(caption.text()).isEqualTo(hook + "\n\n" + LEGAL);
    }

    @Test
    void tiktokTitlesWithTheHookAndDescribesWithTheCaptionAndHashtags() {
        NetworkCaptionFormatter.Caption caption = formatter.format(SocialNetwork.TIKTOK, COPY, PostLanguage.ES);

        assertThat(caption.title()).isEqualTo("Merlot, el tinto amable");
        assertThat(caption.text()).isEqualTo("Hoy es el día del Merlot.\n\n" + LEGAL);
        assertThat(caption.hashtags()).isEqualTo(TAGS);
        assertThat(caption.topicTag()).isNull();
    }

    @Test
    void aLongTiktokHookIsShortenedToNinetyCharactersOnAWord() {
        String hook = words(150);

        String title = formatter.format(SocialNetwork.TIKTOK, copy(hook, "Texto.", TAGS), PostLanguage.ES).title();

        assertThat(title).hasSizeLessThanOrEqualTo(90).endsWith("…");
        assertThat(hook).startsWith(title.substring(0, title.length() - 1) + " ");
    }

    @Test
    void aTiktokDescriptionStaysWithinFourThousandCharacters() {
        String body = words(5_000);

        NetworkCaptionFormatter.Caption caption = formatter.format(SocialNetwork.TIKTOK, copy("Hook", body, TAGS), PostLanguage.ES);

        assertThat(caption.text()).hasSizeLessThanOrEqualTo(4_000).endsWith("…\n\n" + LEGAL);
        assertThat(caption.hashtags()).isEmpty();
    }

    @Test
    void aCutThatFallsOnASpaceKeepsTheWholeLastWordAndOneLongWordIsCutHard() {
        // 90 characters cut at 89: the 90th character is a space, so the first 89 characters are whole words.
        String hook = "a".repeat(89) + " tail and more words";
        assertThat(formatter.format(SocialNetwork.TIKTOK, copy(hook, "Texto.", TAGS), PostLanguage.ES).title())
                .isEqualTo("a".repeat(89) + "…");

        String word = "b".repeat(120);
        assertThat(formatter.format(SocialNetwork.TIKTOK, copy(word, "Texto.", TAGS), PostLanguage.ES).title())
                .isEqualTo("b".repeat(89) + "…");
    }

    @Test
    void theLegalLineFollowsTheLanguage() {
        PostCopy english = PostCopy.of(PostLanguage.EN, "Merlot, the gentle red", SLIDES, "Today is Merlot day.", TAGS, "A glass",
                "Your first Merlot?");

        assertThat(formatter.format(SocialNetwork.THREADS, english, PostLanguage.EN).text())
                .isEqualTo("Merlot, the gentle red\n\nToday is Merlot day.\n\n" + PostLanguage.EN.legalLine());
    }

    private static PostCopy copy(String hook, String body, List<String> hashtags) {
        return new PostCopy(hook, SLIDES, body + "\n\n" + LEGAL, hashtags, "Alt", "Cta");
    }

    /** Words of 4 to 9 letters separated by single spaces, about {@code length} characters long. */
    private static String words(int length) {
        StringBuilder text = new StringBuilder();
        int index = 0;
        while (text.length() < length) {
            if (!text.isEmpty()) {
                text.append(' ');
            }
            text.append("palabra".repeat(1), 0, 4 + index % 4);
            index++;
        }
        return text.toString();
    }
}
