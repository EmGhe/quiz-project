import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * Admin Guard - Protects admin routes
 *
 * For MVP: First user created is admin
 * Future: Add 'isAdmin' field to User model
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.userId; // Set by JwtAuthGuard

    if (!userId) {
      throw new ForbiddenException('Not authenticated');
    }

    // MVP: All authenticated users have admin access
    // TODO: Add proper role-based access control later
    // For now, just check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // For MVP: All users are admin
    // Future: Check user.isAdmin or user.role
    return true;
  }
}
