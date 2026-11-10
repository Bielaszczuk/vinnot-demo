package com.vinnot.winery.domain.valueobject;

import com.vinnot.shared.domain.base.ValueObject;

import java.util.Objects;

/**
 * Value object representing contact information.
 */
public final class ContactInfo extends ValueObject {

    private final String email;
    private final String phone;
    private final String website;

    private ContactInfo(String email, String phone, String website) {
        this.email = email;
        this.phone = phone;
        this.website = website;
    }

    /**
     * Creates ContactInfo with all fields.
     *
     * @param email   the email address
     * @param phone   the phone number
     * @param website the website URL
     * @return the ContactInfo value object
     */
    public static ContactInfo of(String email, String phone, String website) {
        if (Objects.isNull(email) && Objects.isNull(phone) && Objects.isNull(website)) {
            return null;
        }
        return new ContactInfo(email, phone, website);
    }

    /**
     * Gets the email address.
     *
     * @return the email
     */
    public String getEmail() {
        return email;
    }

    /**
     * Gets the phone number.
     *
     * @return the phone
     */
    public String getPhone() {
        return phone;
    }

    /**
     * Gets the website URL.
     *
     * @return the website
     */
    public String getWebsite() {
        return website;
    }

    /**
     * Checks if email is present.
     *
     * @return true if email is set
     */
    public boolean hasEmail() {
        return Objects.nonNull(email) && !email.isBlank();
    }

    /**
     * Checks if phone is present.
     *
     * @return true if phone is set
     */
    public boolean hasPhone() {
        return Objects.nonNull(phone) && !phone.isBlank();
    }

    /**
     * Checks if website is present.
     *
     * @return true if website is set
     */
    public boolean hasWebsite() {
        return Objects.nonNull(website) && !website.isBlank();
    }

    @Override
    protected Object[] getEqualityComponents() {
        return new Object[]{email, phone, website};
    }

    @Override
    public String toString() {
        return String.format("ContactInfo{email='%s', phone='%s', website='%s'}", email, phone, website);
    }
}

