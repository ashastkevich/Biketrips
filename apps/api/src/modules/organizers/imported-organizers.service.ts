import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Raw, Repository } from "typeorm";

import type { ImportSourceEntity } from "../../infrastructure/database/entities/import-source.entity.js";
import { OrganizerEntity } from "../../infrastructure/database/entities/organizer.entity.js";
import { TelegramAccountEntity } from "../../infrastructure/database/entities/telegram-account.entity.js";
import { TripEntity } from "../../infrastructure/database/entities/trip.entity.js";
import { UserEntity } from "../../infrastructure/database/entities/user.entity.js";

/** Who a post says organizes the ride, as the importer extracted it. */
export interface NamedOrganizer {
  clubName: string | null;
  leaderUsernames: string[];
  leaderName: string | null;
}

export type OrganizerSource = Pick<ImportSourceEntity, "handle" | "title" | "organizerId">;

/**
 * Organizer profiles for imported trips. A club or leader the site does not know yet
 * gets a profile owned by a placeholder user (no email, no Telegram, so nobody can sign
 * in as it); a leader takes their profile over by signing in with that Telegram username.
 */
@Injectable()
export class ImportedOrganizersService {
  constructor(
    @InjectRepository(OrganizerEntity)
    private readonly organizersRepository: Repository<OrganizerEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(TelegramAccountEntity)
    private readonly telegramAccountsRepository: Repository<TelegramAccountEntity>,
    @InjectRepository(TripEntity)
    private readonly tripsRepository: Repository<TripEntity>,
  ) {}

  /** The organizer id for an imported trip, or null when the post names nobody. */
  async resolve(source: OrganizerSource, named: NamedOrganizer): Promise<string | null> {
    const clubName = named.clubName?.trim();
    // A named club wins over its ride leaders.
    if (clubName) return this.resolveClub(source, clubName);

    const username = named.leaderUsernames.map(normalizeTelegramUsername).find(Boolean);
    if (!username) return null;
    if (username === normalizeTelegramUsername(source.handle)) return source.organizerId;
    return this.resolveLeader(username, named.leaderName?.trim() || null);
  }

  /**
   * Hands placeholder profiles with this Telegram username over to the user who just
   * proved they own it. Their imported trips move along with the profile.
   */
  async claim(userId: string, telegramUsername: string | null | undefined): Promise<void> {
    const username = normalizeTelegramUsername(telegramUsername);
    if (!username) return;

    const placeholder = await this.organizersRepository.findOne({
      where: { telegramUsername: username, isClaimed: false, kind: "person" },
    });
    if (!placeholder || placeholder.userId === userId) return;

    const placeholderUserId = placeholder.userId;
    const ownProfile = await this.organizersRepository.findOne({ where: { userId } });
    if (ownProfile) {
      await this.tripsRepository.update(
        { importedOrganizerId: placeholder.id },
        { importedOrganizerId: ownProfile.id },
      );
      await this.organizersRepository.delete({ id: placeholder.id });
    } else {
      placeholder.userId = userId;
      placeholder.isClaimed = true;
      await this.organizersRepository.save(placeholder);
    }
    await this.usersRepository.delete({ id: placeholderUserId });
  }

  private async resolveClub(source: OrganizerSource, clubName: string): Promise<string> {
    const key = normalizeName(clubName);
    if (key === normalizeName(source.handle) || key === normalizeName(source.title)) {
      return source.organizerId;
    }

    const existing = await this.organizersRepository.findOne({
      where: {
        kind: "club",
        displayName: Raw((column) => `lower(${column}) = lower(:clubName)`, { clubName }),
      },
    });
    if (existing) return existing.id;

    return this.createPlaceholder({ kind: "club", displayName: clubName, telegramUsername: null });
  }

  private async resolveLeader(username: string, leaderName: string | null): Promise<string> {
    // Someone who already signed in with this Telegram gets the trip on their own profile.
    const account = await this.telegramAccountsRepository.findOne({
      where: { username: Raw((column) => `lower(${column}) = :username`, { username }) },
      relations: { user: true },
    });
    if (account) {
      const ownProfile = await this.organizersRepository.findOne({ where: { userId: account.userId } });
      if (ownProfile) return ownProfile.id;
      const created = await this.organizersRepository.save(
        this.organizersRepository.create({
          userId: account.userId,
          displayName: account.user.name,
          bio: null,
          contactUrl: null,
          isVerified: false,
        }),
      );
      return created.id;
    }

    const existing = await this.organizersRepository.findOne({
      where: { telegramUsername: username },
      relations: { user: true },
    });
    if (existing) {
      // A later post may give the name the first one left out.
      if (!existing.isClaimed && leaderName && existing.user.name !== leaderName) {
        existing.user.name = leaderName;
        existing.displayName = leaderName;
        await this.usersRepository.save(existing.user);
        await this.organizersRepository.save(existing);
      }
      return existing.id;
    }

    return this.createPlaceholder({
      kind: "person",
      displayName: leaderName ?? `@${username}`,
      telegramUsername: username,
    });
  }

  private async createPlaceholder(
    profile: Pick<OrganizerEntity, "kind" | "displayName" | "telegramUsername">,
  ): Promise<string> {
    const user = await this.usersRepository.save(
      this.usersRepository.create({ name: profile.displayName, role: "user" }),
    );
    const organizer = await this.organizersRepository.save(
      this.organizersRepository.create({
        ...profile,
        userId: user.id,
        bio: null,
        contactUrl: null,
        isVerified: false,
        isClaimed: false,
      }),
    );
    return organizer.id;
  }
}

/** Lowercase username without "@", or null when it is not a valid Telegram username. */
export function normalizeTelegramUsername(value: string | null | undefined): string | null {
  const username = value?.trim().replace(/^@/, "").toLowerCase() ?? "";
  return /^[a-z][a-z0-9_]{3,31}$/.test(username) ? username : null;
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/^@/, "").replace(/[\s"'«»„“”_-]/g, "");
}
