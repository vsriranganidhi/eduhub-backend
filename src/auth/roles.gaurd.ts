import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../generated/prisma/client';
import { ROLES_KEY } from './decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. What roles are required for this specific route?
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are required, let them through
    if (!requiredRoles) return true;

    // 2. Get the user from the request (attached by AuthGuard earlier!)
    const { user } = context.switchToHttp().getRequest();

    // 3. Does the user have the required role?
    return requiredRoles.some((role) => user.role === role);
  }
}