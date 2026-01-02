import { Injectable, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

@Injectable()
export class AdminGuard extends JwtAuthGuard {
    canActivate(context: ExecutionContext) {
        return super.canActivate(context);
    }

    handleRequest(err: any, user: any) {

        const validatedUser = super.handleRequest(err, user);

        if (validatedUser.role !== 'ADMIN') {
            throw new ForbiddenException('Chỉ có quyền ADMIN mới có thể truy cập tính năng này');
        }

        return validatedUser;
    }
}

