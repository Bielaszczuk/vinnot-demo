package com.vinnot.admin.application.port.in;

public interface StoreCatalogImageUseCase {
    String execute(byte[] image, String contentType);
}
