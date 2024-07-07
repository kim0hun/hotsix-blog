import { BadRequestException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { CredentialDto } from './dto/credential.dto';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { Payload } from './dto/payload.dto';
import { User } from 'src/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { UserDto } from './dto/createUser.dto';
import { ResetPasswordWithCodeDto } from './dto/resetPasswordWithCode.dto';
import { MailerService } from '@nestjs-modules/mailer';
import { RequestPasswordResetDto } from './dto/requestPasswordReset.dto';

@Injectable()
export class AuthService {
  private verificationCodes = new Map<string, string>();

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailerService: MailerService,
  ) {}

  async signup(newUser: UserDto): Promise<UserDto> {
    let user: UserDto = await this.usersService.findByFields({
      where: { email: newUser.email },
    });
    if (user) {
      throw new HttpException('이메일 또는 닉네임이 중복되었습니다.', HttpStatus.BAD_REQUEST);
    }
    return await this.usersService.save(newUser);
  }

  async signin(credentialDto: CredentialDto): Promise<{ accessToken: string } | undefined> {
    const user: User = await this.usersService.findByFields({
      where: { email: credentialDto.email },
    });
    if (!user) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    const isValidatePassword = await bcrypt.compare(credentialDto.password, user.password);
    if (!isValidatePassword) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }
    const payload: Payload = { id: user.userId, email: user.email };
    return {
      accessToken: this.jwtService.sign(payload),
    };
  }

  async requestPasswordReset(requestPasswordResetDto: RequestPasswordResetDto): Promise<void> {
    const { email } = requestPasswordResetDto;
    const user: User = await this.usersService.findByFields({
      where: { email },
    });
    if (!user) {
      throw new BadRequestException('등록되지 않은 이메일입니다.');
    }
    // 이메일 인증코드 생성
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    this.verificationCodes.set(email, verificationCode);

    await this.mailerService.sendMail({
      to: email,
      subject: '비밀번호 재설정 인증 코드',
      text: `인증 코드는 ${verificationCode} 입니다.`,
    });
  }

  async resetPasswordWithCode(resetPasswordWithCodeDto: ResetPasswordWithCodeDto): Promise<void> {
    const { email, verificationCode, newPassword } = resetPasswordWithCodeDto;

    const user = await this.usersService.findByFields({ where: { email } });
    if (!user) {
      throw new BadRequestException('등록되지 않은 이메일입니다.');
    }

    const storedCode = this.verificationCodes.get(email);
    if (!storedCode || storedCode !== verificationCode) {
      throw new UnauthorizedException('유효하지 않은 인증 코드입니다.');
    }

    user.password = newPassword;
    await this.usersService.save(user);
    this.verificationCodes.delete(email);
  }
}
