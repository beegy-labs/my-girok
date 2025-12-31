import { Global, Module } from '@nestjs/common';
import { IdentityPrismaService } from './identity-prisma.service';
import { AuthPrismaService } from './auth-prisma.service';
import { LegalPrismaService } from './legal-prisma.service';

@Global()
@Module({
  providers: [IdentityPrismaService, AuthPrismaService, LegalPrismaService],
  exports: [IdentityPrismaService, AuthPrismaService, LegalPrismaService],
})
export class DatabaseModule {}
