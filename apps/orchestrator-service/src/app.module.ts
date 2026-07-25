import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DockerService } from './docker.service';
import { PrismaService } from './prisma.service';
import { AuthModule } from './auth/auth.module';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { JwtStrategy } from './auth/jwt.strategy';
import { AdminController } from './admin/admin.controller';
import { RolesGuard } from './auth/roles.guard';
import { VersionService } from './version.service';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { ConsoleGateway } from './console.gateway';
import { PlayerController } from './player.controller';
import { PlayerService } from './player.service';
import { ServerPropertiesService } from './server-properties.service';
import { ServerPropertiesController } from './server-properties.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    AuthModule,
  ],
  controllers: [AppController, AuthController, AdminController, FilesController, PlayerController, ServerPropertiesController],
  providers: [
    AppService,
    DockerService,
    PrismaService,
    VersionService,
    FilesService,
    ConsoleGateway,
    PlayerService,
    ServerPropertiesService,
  ],
})
export class AppModule {}
