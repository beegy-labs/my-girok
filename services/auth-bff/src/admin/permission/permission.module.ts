import { Module } from '@nestjs/common';
import { PermissionController } from './permission.controller';
import { PermissionService } from './permission.service';
import { GrpcClientsModule } from '../../grpc-clients/grpc-clients.module';

@Module({
  imports: [GrpcClientsModule],
  controllers: [PermissionController],
  providers: [PermissionService],
  exports: [PermissionService],
})
export class PermissionModule {}
