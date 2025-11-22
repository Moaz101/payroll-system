import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { payrollTrackingModels } from './schemas';
import { PayrollTrackingService } from './payroll-tracking.service';
import { PayrollTrackingController } from './payroll-tracking.controller';

@Module({
  imports: [
    MongooseModule.forFeature(payrollTrackingModels),
  ],
  controllers: [PayrollTrackingController],
  providers: [PayrollTrackingService],
  exports: [PayrollTrackingService],
})
export class PayrollTrackingModule {}