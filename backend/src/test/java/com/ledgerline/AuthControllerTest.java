package com.ledgerline;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ledgerline.dto.LoginRequest;
import com.ledgerline.repository.AccountRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private AccountRepository accountRepository;

    @Test
    @DisplayName("Conservation Invariant on Seed: Total system balance across all accounts is 0")
    void verifyConservationInvariantOnSeed() {
        Long totalBalance = accountRepository.sumAllBalances();
        assertThat(totalBalance)
                .as("Double-entry invariant: Sum of all accounts including EXTERNAL must be 0")
                .isEqualTo(0L);
    }

    @Test
    @DisplayName("Admin Login Success: Returns 200 with JWT and ADMIN role")
    void adminLoginSuccess() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("admin@ledgerline.internal")
                .password("Admin123!")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", notNullValue()))
                .andExpect(jsonPath("$.role", is("ADMIN")))
                .andExpect(jsonPath("$.email", is("admin@ledgerline.internal")));
    }

    @Test
    @DisplayName("Auditor Login Success: Returns 200 with AUDITOR role")
    void auditorLoginSuccess() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("auditor@ledgerline.internal")
                .password("Auditor123!")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", notNullValue()))
                .andExpect(jsonPath("$.role", is("AUDITOR")));
    }

    @Test
    @DisplayName("Holder 1 Login Success: Returns 200 with HOLDER role")
    void holderLoginSuccess() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("holder1@ledgerline.internal")
                .password("Holder123!")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", notNullValue()))
                .andExpect(jsonPath("$.role", is("HOLDER")));
    }

    @Test
    @DisplayName("Bad Password: Returns 401 Unauthorized ProblemDetail")
    void badPasswordReturnsUnauthorized() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("holder2@ledgerline.internal")
                .password("WrongPassword999!")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.title", is("Unauthorized")));
    }

    @Test
    @DisplayName("Non-existent User: Returns 401 Unauthorized")
    void nonExistentUserReturnsUnauthorized() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("ghost@ledgerline.internal")
                .password("Whatever123!")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Unauthenticated Me endpoint returns 401 Unauthorized")
    void unauthenticatedMeReturns401() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Register Customer (HOLDER): Returns 201 with JWT and creates account")
    void registerHolderSuccess() throws Exception {
        com.ledgerline.dto.RegisterRequest request = com.ledgerline.dto.RegisterRequest.builder()
                .email("newcustomer" + System.currentTimeMillis() + "@ledgerline.internal")
                .password("Password123!")
                .role(com.ledgerline.domain.Role.HOLDER)
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token", notNullValue()))
                .andExpect(jsonPath("$.role", is("HOLDER")));
    }

    @Test
    @DisplayName("Register Admin Forbidden: ADMIN role signup returns 400 Bad Request")
    void registerAdminForbidden() throws Exception {
        com.ledgerline.dto.RegisterRequest request = com.ledgerline.dto.RegisterRequest.builder()
                .email("fakeadmin" + System.currentTimeMillis() + "@ledgerline.internal")
                .password("Password123!")
                .role(com.ledgerline.domain.Role.ADMIN)
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail", is("Registration for the ADMIN role is strictly prohibited. The system administrator account is pre-provisioned.")));
    }
}

