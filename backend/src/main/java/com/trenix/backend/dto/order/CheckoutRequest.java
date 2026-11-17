package com.trenix.backend.dto.order;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class CheckoutRequest {

    @NotBlank(message = "Prenumele este obligatoriu")
    @Size(max = 100, message = "Prenumele poate avea maximum 100 de caractere")
    private String firstName;

    @NotBlank(message = "Numele este obligatoriu")
    @Size(max = 100, message = "Numele poate avea maximum 100 de caractere")
    private String lastName;

    @NotBlank(message = "Email-ul este obligatoriu")
    @Email(message = "Adresa de email nu este validă")
    @Size(max = 150, message = "Email-ul poate avea maximum 150 de caractere")
    private String email;

    @NotBlank(message = "Numărul de telefon este obligatoriu")
    @Pattern(
            regexp = "^[+]?[0-9\\s()\\-]{7,20}$",
            message = "Numărul de telefon nu este valid"
    )
    private String phone;

    @NotBlank(message = "Adresa de livrare este obligatorie")
    @Size(max = 255, message = "Adresa poate avea maximum 255 de caractere")
    private String shippingAddress;

    @NotBlank(message = "Orașul este obligatoriu")
    @Size(max = 100, message = "Orașul poate avea maximum 100 de caractere")
    private String city;

    @NotBlank(message = "Județul este obligatoriu")
    @Size(max = 100, message = "Județul poate avea maximum 100 de caractere")
    private String county;

    @NotBlank(message = "Codul poștal este obligatoriu")
    @Size(min = 3, max = 12, message = "Codul poștal trebuie să aibă între 3 și 12 caractere")
    private String postalCode;

    @Size(max = 1000, message = "Observațiile pot avea maximum 1000 de caractere")
    private String notes;

    public CheckoutRequest() {
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getShippingAddress() {
        return shippingAddress;
    }

    public void setShippingAddress(String shippingAddress) {
        this.shippingAddress = shippingAddress;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getCounty() {
        return county;
    }

    public void setCounty(String county) {
        this.county = county;
    }

    public String getPostalCode() {
        return postalCode;
    }

    public void setPostalCode(String postalCode) {
        this.postalCode = postalCode;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}