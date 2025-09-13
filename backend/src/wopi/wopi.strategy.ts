import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WopiStrategy extends PassportStrategy(Strategy, 'wopi') {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromUrlQueryParameter('access_token'),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('WOPI_JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // The payload contains userId, fileId, and canWrite
    return { userId: payload.sub, fileId: payload.fileId, canWrite: payload.canWrite };
  }
}
