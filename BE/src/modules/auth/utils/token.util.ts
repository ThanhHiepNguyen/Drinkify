import { JwtService } from '@nestjs/jwt';

export const createToken = (
    jwtService: JwtService,
    user: { userId: string; email: string; role: string },
): string => {
    const payload = {
        sub: user.userId,
        email: user.email,
        role: user.role,
    };
    return jwtService.sign(payload);
};

