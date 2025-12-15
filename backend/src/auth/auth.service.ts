import { Injectable, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(createUserDto: any): Promise<Omit<User, 'password_hash'>> {
    const { email, password, role } = createUserDto;

    const existingUser = await this.usersService.findOne(email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const password_hash = await bcrypt.hash(password, 10);
    const newUser = await this.usersService.create({ email, password_hash, role });

    const { password_hash: _, ...result } = newUser;
    return result;
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(email);
    if (user && (await bcrypt.compare(pass, user.password_hash))) {
      const { password_hash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    
    const jwtSecret = this.configService.get<string>('JWT_SECRET_KEY');
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET');
    
    return {
      access_token: this.jwtService.sign(payload, {
        secret: jwtSecret,
        expiresIn: 3600, // 1 hour
      }),
      refresh_token: this.jwtService.sign(payload, {
        secret: refreshSecret,
        expiresIn: 604800, // 7 days
      }),
    };
  }

  async refreshToken(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    
    const jwtSecret = this.configService.get<string>('JWT_SECRET_KEY');
    
    return {
      access_token: this.jwtService.sign(payload, {
        secret: jwtSecret,
        expiresIn: 3600, // 1 hour
      }),
    };
  }

  async generateWopiToken(
    userId: string,
    fileId: string,
    canWrite: boolean,
  ): Promise<string> {
    const payload = {
      sub: userId,
      fileId: fileId,
      canWrite: canWrite,
    };
    // console.log(payload);
    const secret = this.configService.get<string>('WOPI_JWT_SECRET');

    if (!secret) {
      throw new Error('WOPI_JWT_SECRET environment variable is not defined!');
    }
    
    return this.jwtService.sign(payload, {
      secret: secret,
      expiresIn: 3600, // 1 hour
    });
  }
}
