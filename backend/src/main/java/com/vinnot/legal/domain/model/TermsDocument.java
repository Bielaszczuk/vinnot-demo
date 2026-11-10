package com.vinnot.legal.domain.model;
import java.util.List;
public record TermsDocument(String version, String acceptanceRevision, String locale, String contentHash,
        String title, String summary, List<Section> sections) {
    public TermsDocument { sections = List.copyOf(sections); }
    public record Section(String id, String title, String body) { }
}
