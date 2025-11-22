// backend/src/payroll-tracking/schemas/index.ts
import { Schema } from 'mongoose';
import { DisputeSchema } from './dispute.schema';
import { ClaimSchema } from './claim.schema';
import { PayslipSchema } from './payslip.schema';
import { PayrollSchema } from './payroll.schema';
import { TimesheetSchema } from './timesheet.schema';

export const payrollTrackingModels: { name: string; schema: Schema }[] = [
  { name: 'Dispute', schema: DisputeSchema },
  { name: 'Claim', schema: ClaimSchema },
  { name: 'Payslip', schema: PayslipSchema },
  { name: 'Payroll', schema: PayrollSchema },
  { name: 'Timesheet', schema: TimesheetSchema },
];

// backend/src/payroll-tracking/index.ts
export * from './payroll-tracking.module';
export * from './payroll-tracking.service';
export * from './schemas';