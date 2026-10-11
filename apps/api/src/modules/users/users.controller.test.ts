import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { UsersController } from "./users.controller.js";
import type { UsersService } from "./users.service.js";

const userId = "11111111-1111-4111-8111-111111111111";
const otherUserId = "22222222-2222-4222-8222-222222222222";

describe("UsersController", () => {
  it("returns the current user's own profile", async () => {
    const context = createUsersController();

    await expect(
      context.controller.get(userId, { user: { id: userId, role: "user" } }),
    ).resolves.toEqual({ id: userId });
    expect(context.usersService.get).toHaveBeenCalledWith(userId);
  });

  it("forbids reading another user's profile", async () => {
    const context = createUsersController();

    await expect(
      context.controller.get(otherUserId, { user: { id: userId, role: "user" } }),
    ).rejects.toThrow(ForbiddenException);
    expect(context.usersService.get).not.toHaveBeenCalled();
  });

  it("lets admins read any profile", async () => {
    const context = createUsersController();

    await context.controller.get(otherUserId, { user: { id: userId, role: "admin" } });

    expect(context.usersService.get).toHaveBeenCalledWith(otherUserId);
  });
});

function createUsersController() {
  const usersService = {
    get: vi.fn(async (id: string) => ({ id })),
    update: vi.fn(),
  };
  const controller = new UsersController(usersService as unknown as UsersService);
  return { controller, usersService };
}
