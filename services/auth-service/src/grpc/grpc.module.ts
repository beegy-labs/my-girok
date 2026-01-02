import { Module } from '@nestjs/common';
import { AuthGrpcController } from './auth.grpc.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AuthGrpcController],
})
export class GrpcModule {}
