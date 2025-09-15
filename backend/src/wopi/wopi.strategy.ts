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
      secretOrKeyProvider: (request, rawJwtToken, done) => {
        const secret = configService.get<string>('WOPI_JWT_SECRET');
        done(null, secret);
      },
    });
  }

  async validate(payload: any) {
    // console.log(payload);
    return {
      userId: payload.sub,
      fileId: payload.fileId,
      canWrite: payload.canWrite,
    };
  }
}
