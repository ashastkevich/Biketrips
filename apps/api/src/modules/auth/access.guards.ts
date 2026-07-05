import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { ForbiddenException, Injectable } from "@nestjs/common";
import { canCreateTrips } from "@biketrips/domain";
import type { AuthenticatedUser } from "@biketrips/domain";

function getUser(context: ExecutionContext): AuthenticatedUser | null {
  return context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>().user ?? null;
}

@Injectable()
export class TripCreatorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (!canCreateTrips(getUser(context))) {
      throw new ForbiddenException("A phone number is required to create trips");
    }

    return true;
  }
}

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (getUser(context)?.role !== "admin") {
      throw new ForbiddenException("Administrator access is required");
    }

    return true;
  }
}
