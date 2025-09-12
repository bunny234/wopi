import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async generateWopiToken(
    userId: string,
    fileId: string,
    permissions: { canWrite: boolean },
  ): Promise<string> {
    const payload = {
      sub: userId,
      fileId: fileId,
      canWrite: permissions.canWrite,
    };
    return this.jwtService.sign(payload);
  }
}
