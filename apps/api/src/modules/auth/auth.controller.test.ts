import { describe, expect, it, vi } from "vitest";

import { AuthController } from "./auth.controller.js";
import type { AuthService, TokenPayload } from "./auth.service.js";

describe("AuthController", () => {
  it("passes the authorization header when requesting Telegram login", async () => {
    const authService = createAuthServiceMock();
    authService.requestTelegramLogin.mockResolvedValue({
      loginId: "login-1",
      pollToken: "poll-token",
      botUrl: "https://t.me/biketrips_bot?start=login_token",
      expiresAt: "2099-08-16T12:00:00.000Z",
    });
    const controller = new AuthController(authService);

    await expect(
      controller.requestTelegramLogin({
        headers: { authorization: "Bearer current-token" },
      })
    ).resolves.toEqual({
      loginId: "login-1",
      pollToken: "poll-token",
      botUrl: "https://t.me/biketrips_bot?start=login_token",
      expiresAt: "2099-08-16T12:00:00.000Z",
    });

    expect(authService.requestTelegramLogin).toHaveBeenCalledWith("Bearer current-token");
  });

  it("delegates Telegram status and confirmation requests", async () => {
    const authService = createAuthServiceMock();
    authService.getTelegramLoginStatus.mockResolvedValue({ status: "pending" });
    authService.confirmTelegramLogin.mockResolvedValue({
      ok: true,
      linkedExistingUser: false,
    });
    const controller = new AuthController(authService);

    await expect(
      controller.getTelegramLoginStatus({
        loginId: "login-1",
        pollToken: "poll-token",
      })
    ).resolves.toEqual({ status: "pending" });
    await expect(
      controller.confirmTelegramLogin(
        {
          startParam: "login_start-token",
          telegramId: "123456789",
          username: "rider",
          firstName: "Alex",
          lastName: "Ivanov",
          photoUrl: "https://example.test/photo.jpg",
        },
        "Bearer bot-token"
      )
    ).resolves.toEqual({ ok: true, linkedExistingUser: false });

    expect(authService.getTelegramLoginStatus).toHaveBeenCalledWith({
      loginId: "login-1",
      pollToken: "poll-token",
    });
    expect(authService.confirmTelegramLogin).toHaveBeenCalledWith(
      {
        startParam: "login_start-token",
        telegramId: "123456789",
        username: "rider",
        firstName: "Alex",
        lastName: "Ivanov",
        photoUrl: "https://example.test/photo.jpg",
      },
      "Bearer bot-token"
    );
  });

  it("passes authorization when verifying an email code", async () => {
    const authService = createAuthServiceMock();
    authService.requestEmailCode.mockResolvedValue({ ok: true });
    authService.verifyEmailCode.mockResolvedValue({
      accessToken: "access-token",
      tokenType: "Bearer",
    });
    const controller = new AuthController(authService);

    await expect(controller.requestEmailCode({ email: "rider@example.com" })).resolves.toEqual({
      ok: true,
    });
    await expect(
      controller.verifyEmailCode(
        {
          email: "rider@example.com",
          code: "123456",
        },
        "Bearer current-token"
      )
    ).resolves.toEqual({
      accessToken: "access-token",
      tokenType: "Bearer",
    });

    expect(authService.requestEmailCode).toHaveBeenCalledWith({ email: "rider@example.com" });
    expect(authService.verifyEmailCode).toHaveBeenCalledWith(
      {
        email: "rider@example.com",
        code: "123456",
      },
      "Bearer current-token"
    );
  });

  it("issues a development token with default values", async () => {
    const authService = createAuthServiceMock();
    authService.issueToken.mockReturnValue({
      accessToken: "dev-access-token",
      tokenType: "Bearer",
    });
    const controller = new AuthController(authService);

    await expect(controller.devLogin({ userId: "user-1" })).resolves.toEqual({
      accessToken: "dev-access-token",
      tokenType: "Bearer",
    });

    expect(authService.issueToken).toHaveBeenCalledWith({
      sub: "user-1",
      name: "Local user",
      role: "user",
      phone: undefined,
      phoneVerified: false,
    });
  });

  it("issues a development token with explicit profile fields", async () => {
    const authService = createAuthServiceMock();
    authService.issueToken.mockReturnValue({
      accessToken: "dev-access-token",
      tokenType: "Bearer",
    });
    const controller = new AuthController(authService);

    await controller.devLogin({
      userId: "admin-1",
      name: "Admin",
      role: "admin",
      phone: "+79990000000",
      phoneVerified: true,
    });

    expect(authService.issueToken).toHaveBeenCalledWith({
      sub: "admin-1",
      name: "Admin",
      role: "admin",
      phone: "+79990000000",
      phoneVerified: true,
    });
  });

  it("returns the authenticated token payload from me", async () => {
    const authService = createAuthServiceMock();
    const controller = new AuthController(authService);
    const payload: TokenPayload = {
      sub: "user-1",
      name: "Rider",
      role: "user",
      phoneVerified: false,
    };

    await expect(controller.me({ user: payload })).resolves.toBe(payload);
  });
});

function createAuthServiceMock() {
  return {
    requestTelegramLogin: vi.fn<AuthService["requestTelegramLogin"]>(),
    getTelegramLoginStatus: vi.fn<AuthService["getTelegramLoginStatus"]>(),
    confirmTelegramLogin: vi.fn<AuthService["confirmTelegramLogin"]>(),
    requestEmailCode: vi.fn<AuthService["requestEmailCode"]>(),
    verifyEmailCode: vi.fn<AuthService["verifyEmailCode"]>(),
    issueToken: vi.fn<AuthService["issueToken"]>(),
  } as unknown as AuthServiceMock;
}

type AuthServiceMock = AuthService & {
  requestTelegramLogin: ReturnType<typeof vi.fn<AuthService["requestTelegramLogin"]>>;
  getTelegramLoginStatus: ReturnType<typeof vi.fn<AuthService["getTelegramLoginStatus"]>>;
  confirmTelegramLogin: ReturnType<typeof vi.fn<AuthService["confirmTelegramLogin"]>>;
  requestEmailCode: ReturnType<typeof vi.fn<AuthService["requestEmailCode"]>>;
  verifyEmailCode: ReturnType<typeof vi.fn<AuthService["verifyEmailCode"]>>;
  issueToken: ReturnType<typeof vi.fn<AuthService["issueToken"]>>;
};
