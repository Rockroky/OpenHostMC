import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RolesGuard, Roles } from './roles.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @UseGuards(AuthGuard('local'))
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @Post('register')
  async register(@Body() body: any) {
    const { email, username, password } = body;
    return this.authService.register(email, username, password);
  }

  @Post('change-password')
  @UseGuards(AuthGuard('jwt'))
  async changePassword(
    @Request() req,
    @Body() body: { oldPassword: string; newPassword: string },
  ) {
    return this.authService.changePassword(req.user.userId, body.oldPassword, body.newPassword);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@Request() req) {
    const { userId, ...rest } = req.user;
    return { id: userId, ...rest };
  }

  @Post('admin-setup')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  async setupAdminUser(@Body() body: { email: string; username: string; password: string }) {
    return this.authService.register(body.email, body.username, body.password);
  }

  @Post('complete-admin-setup')
  @UseGuards(AuthGuard('jwt'))
  async completeAdminSetup(
    @Request() req,
    @Body() body: { newPassword: string; securityQuestion: string; securityAnswer: string },
  ) {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPERADMIN') {
      throw new Error('Solo gli admin possono completare questo setup');
    }
    return this.authService.completeAdminSetup(req.user.userId, body.newPassword, body.securityQuestion, body.securityAnswer);
  }
}
