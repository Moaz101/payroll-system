import mongoose from 'mongoose';
import { payrollRuns } from '../payroll-execution/models/payrollRuns.schema';
import { employeePayrollDetailsSchema } from '../payroll-execution/models/employeePayrollDetails.schema';
import { employeePenaltiesSchema } from '../payroll-execution/models/employeePenalties.schema';
import { paySlipSchema } from '../payroll-execution/models/payslip.schema';
import { employeeSigningBonusSchema } from '../payroll-execution/models/EmployeeSigningBonus.schema';
import { EmployeeTerminationResignationSchema } from '../payroll-execution/models/EmployeeTerminationResignation.schema';
import { SchemaFactory } from '@nestjs/mongoose';
import { PayRollStatus, PayRollPaymentStatus, BankStatus, PaySlipPaymentStatus, BonusStatus, BenefitStatus } from '../payroll-execution/enums/payroll-execution-enum';
import { ConfigStatus } from '../payroll-configuration/enums/payroll-configuration-enums';

const payrollRunsSchema = SchemaFactory.createForClass(payrollRuns);

export async function seedPayrollExecution(connection: mongoose.Connection, employees: any, payrollConfig?: any, recruitmentData?: any) {
  const PayrollRunsModel = connection.model('payrollRuns', payrollRunsSchema);
  const EmployeePayrollDetailsModel = connection.model('employeePayrollDetails', employeePayrollDetailsSchema);
  const EmployeePenaltiesModel = connection.model('employeePenalties', employeePenaltiesSchema);
  const PaySlipModel = connection.model('paySlip', paySlipSchema);
  const EmployeeSigningBonusModel = connection.model('employeeSigningBonus', employeeSigningBonusSchema);
  const EmployeeTerminationResignationModel = connection.model('EmployeeTerminationResignation', EmployeeTerminationResignationSchema);

  console.log('Clearing Payroll Execution...');
  await PayrollRunsModel.deleteMany({});
  await EmployeePayrollDetailsModel.deleteMany({});
  await EmployeePenaltiesModel.deleteMany({});
  await PaySlipModel.deleteMany({});
  await EmployeeSigningBonusModel.deleteMany({});
  await EmployeeTerminationResignationModel.deleteMany({});

  console.log('Seeding Payroll Runs...');
  const janRun = await PayrollRunsModel.create({
    runId: 'PR-2025-001',
    payrollPeriod: new Date('2025-01-31'),
    status: PayRollStatus.DRAFT,
    entity: 'Tech Corp',
    employees: 50,
    exceptions: 2,
    totalnetpay: 500000,
    payrollSpecialistId: employees.alice._id,
    paymentStatus: PayRollPaymentStatus.PENDING,
    payrollManagerId: employees.alice._id,
  });
  console.log('Payroll Runs seeded.');

  console.log('Seeding Employee Payroll Details...');
  await EmployeePayrollDetailsModel.create({
    employeeId: employees.bob._id,
    baseSalary: 15000,
    allowances: 3000,
    deductions: 1500,
    netSalary: 16500,
    netPay: 16500,
    bankStatus: BankStatus.VALID,
    payrollRunId: janRun._id,
  });
  console.log('Employee Payroll Details seeded.');

  console.log('Seeding Employee Penalties...');
  await EmployeePenaltiesModel.create({
    employeeId: employees.charlie._id,
    penalties: [
      { reason: 'Late Arrival', amount: 100 }
    ]
  });
  console.log('Employee Penalties seeded.');

  console.log('Seeding Employee Signing Bonuses...');
  if (payrollConfig && payrollConfig.bonuses && payrollConfig.bonuses.seniorSigningBonus) {
    await EmployeeSigningBonusModel.create({
      employeeId: employees.alice._id,
      signingBonusId: payrollConfig.bonuses.seniorSigningBonus._id,
      paymentDate: new Date(),
      status: BonusStatus.APPROVED,
    });
    console.log('Employee Signing Bonuses seeded.');
  } else {
    console.log('Skipping Employee Signing Bonuses (missing config).');
  }

  console.log('Seeding Employee Termination/Resignation Benefits...');
  if (payrollConfig && payrollConfig.benefits && payrollConfig.benefits.endOfService && 
      recruitmentData && recruitmentData.terminations && recruitmentData.terminations.terminationRequest) {
    await EmployeeTerminationResignationModel.create({
      employeeId: employees.charlie._id,
      allowanceId: payrollConfig.benefits.endOfService._id,
      terminationId: recruitmentData.terminations.terminationRequest._id,
      status: BenefitStatus.PENDING,
    });
    console.log('Employee Termination/Resignation Benefits seeded.');
  } else {
    console.log('Skipping Employee Termination/Resignation Benefits (missing config or termination request).');
  }

  console.log('Seeding Payslips...');
  const bobPayslip = await PaySlipModel.create({
    employeeId: employees.bob._id,
    payrollRunId: janRun._id,
    earningsDetails: {
      baseSalary: 15000,
      allowances: [
        { name: 'Housing Allowance', amount: 2000, status: ConfigStatus.APPROVED },
        { name: 'Transport Allowance', amount: 1000, status: ConfigStatus.APPROVED }
      ],
      bonuses: [],
      benefits: [],
      refunds: []
    },
    deductionsDetails: {
      taxes: [
        { name: 'Income Tax', rate: 10, status: ConfigStatus.APPROVED }
      ],
      insurances: [],
      penalties: null
    },
    totalGrossSalary: 18000,
    totaDeductions: 1500,
    netPay: 16500,
    paymentStatus: PaySlipPaymentStatus.PENDING
  });
  console.log('Payslips seeded.');

  return { janRun, bobPayslip };
}
