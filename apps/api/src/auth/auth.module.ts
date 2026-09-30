import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { VerificadorToken } from './verificador-token.service';

@Module({
  controllers: [AuthController],
  providers: [VerificadorToken, { provide: APP_GUARD, useClass: AuthGuard }],
  exports: [VerificadorToken],
})
export class AuthModule {}
