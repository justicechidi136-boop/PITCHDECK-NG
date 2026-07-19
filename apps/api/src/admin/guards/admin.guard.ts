import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { AUTH_ERROR_CODES } from "@pitchdeck/contracts";
import { RbacService, type AuthenticatedUser } from "../../rbac/rbac.service";

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly rbacService: RbacService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException({
        code: AUTH_ERROR_CODES.UNAUTHORIZED,
        message: "Authentication required",
      });
    }
    this.rbacService.assertAdminAccess(user);
    return true;
  }
}
