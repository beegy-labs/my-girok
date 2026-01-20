import { Module } from '@nestjs/common';
import { DepartmentController } from './department.controller';
import { DepartmentService } from './department.service';
import { GrpcClientsModule } from '../../grpc-clients/grpc-clients.module';

@Module({
  imports: [GrpcClientsModule],
  controllers: [DepartmentController],
  providers: [DepartmentService],
  exports: [DepartmentService],
})
export class DepartmentModule {}
