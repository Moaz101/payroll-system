'use client';

import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/services/api';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { FileText, TrendingUp, AlertTriangle, Clock, Download, Calendar, Users, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

interface ReportData {
  startDate: string;
  endDate: string;
  totalRecords: number;
  data: any[];
  summary?: {
    // Attendance summary
    totalWorkMinutes?: number;
    totalWorkHours?: number;
    averageWorkMinutes?: number;
    averageWorkHours?: number;
    lateCount?: number;
    latePercentage?: number;
    totalLateMinutes?: number;
    missedPunchCount?: number;
    onTimeCount?: number;
    onTimePercentage?: number;
    uniqueEmployees?: number;
    overtimeRecords?: number;
    // Overtime summary
    totalOvertimeMinutes?: number;
    totalOvertimeHours?: number;
    employeesWithOvertime?: number;
    overtimeThresholdMinutes?: number;
    multiplier?: number;
    averageOvertimePerRecord?: number;
    // Lateness summary
    totalLateHours?: number;
    employeesLate?: number;
    gracePeriodMinutes?: number;
    beyondGraceCount?: number;
    withinGraceCount?: number;
    averageLateMinutes?: number;
    // Exceptions summary
    employeesWithExceptions?: number;
    byType?: Record<string, number>;
    byStatus?: Record<string, number>;
    openCount?: number;
    resolvedCount?: number;
    pendingCount?: number;
  };
}

interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  employeeNumber: string;
}

interface Department {
  _id: string;
  name: string;
  code?: string;
}

export default function ReportsTab() {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<'overtime' | 'lateness' | 'attendance' | 'exceptions'>('attendance');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    employeeId: '',
    departmentId: '',
  });
  const [userRole, setUserRole] = useState<string>('');

  // Role-based permissions - matches backend controller @Roles decorators
  const isSystemAdmin = userRole === 'System Admin';
  const isHRAdmin = userRole === 'HR Admin';
  const isHRManager = userRole === 'HR Manager';
  const isPayrollManager = userRole === 'Payroll Manager';
  const isPayrollSpecialist = userRole === 'Payroll Specialist';
  const isAdmin = isSystemAdmin || isHRAdmin || isHRManager;
  const isPayroll = isPayrollManager || isPayrollSpecialist;
  const canViewReports = isAdmin || isPayroll; // POST reports: SYSTEM_ADMIN, HR_ADMIN, HR_MANAGER, PAYROLL_MANAGER, PAYROLL_SPECIALIST

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user.role) setUserRole(user.role);
      } catch (e) {
        console.error('Error parsing user from localStorage');
      }
    }
    fetchEmployees();
    fetchDepartments();
  }, []);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/employee-profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setEmployees(Array.isArray(data) ? data : data.employees || []);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/organization-structure/departments`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setDepartments(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const generateReport = async () => {
    if (!filters.startDate || !filters.endDate) {
      toast.error('Please select a date range');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login first');
        return;
      }

      const requestBody: any = {
        startDate: filters.startDate,
        endDate: filters.endDate,
      };

      if (filters.employeeId) {
        requestBody.employeeId = filters.employeeId;
      }

      if (filters.departmentId) {
        requestBody.departmentId = filters.departmentId;
      }

      const response = await fetch(`${API_BASE_URL}/time-management/reports/${reportType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setReportData(data);
      toast.success('Report generated successfully!');
    } catch (error: any) {
      console.error('Generate report error:', error);
      toast.error(error.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!reportData || !reportData.data.length) {
      toast.error('No data to export');
      return;
    }

    let csvContent = '';
    const headers = Object.keys(reportData.data[0]);
    csvContent += headers.join(',') + '\n';

    reportData.data.forEach((row) => {
      const values = headers.map((header) => {
        const value = row[header];
        if (typeof value === 'object') {
          return JSON.stringify(value).replace(/,/g, ';');
        }
        return String(value || '').replace(/,/g, ';');
      });
      csvContent += values.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}_report_${filters.startDate}_to_${filters.endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Report exported successfully!');
  };

  const formatMinutesToHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getEmployeeName = (employee: any) => {
    if (!employee) return 'N/A';
    if (typeof employee === 'string') return employee;
    return employee.fullName || `${employee.firstName} ${employee.lastName}` || 'N/A';
  };

  const renderReportTable = () => {
    if (!reportData || !reportData.data.length) {
      return (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <FileText size={48} style={{ color: '#cbd5e1', marginBottom: '16px' }} />
          <Typography sx={{ color: '#94a3b8' }}>No data found for the selected criteria</Typography>
        </Box>
      );
    }

    switch (reportType) {
      case 'overtime':
        return (
          <Table>
            <TableHead>
              <TableRow sx={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Employee</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Total Work</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Overtime</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reportData.data.map((row, index) => (
                <TableRow key={index} sx={{ '&:hover': { background: 'rgba(99, 102, 241, 0.04)' } }}>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600, color: '#1e293b' }}>{getEmployeeName(row.employee)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ color: '#64748b' }}>{new Date(row.date).toLocaleDateString()}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={formatMinutesToHours(row.totalWorkMinutes || 0)}
                      size="small"
                      sx={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={formatMinutesToHours(row.overtimeMinutes || 0)}
                      size="small"
                      sx={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', fontWeight: 600 }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'lateness':
        return (
          <Table>
            <TableHead>
              <TableRow sx={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Employee</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Late By</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reportData.data.map((row, index) => (
                <TableRow key={index} sx={{ '&:hover': { background: 'rgba(239, 68, 68, 0.04)' } }}>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600, color: '#1e293b' }}>{getEmployeeName(row.employee)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ color: '#64748b' }}>{new Date(row.date).toLocaleDateString()}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={`${row.lateMinutes || 0} min`}
                      size="small"
                      sx={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', fontWeight: 600 }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'attendance':
        return (
          <Table>
            <TableHead>
              <TableRow sx={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Employee</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Work Hours</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reportData.data.map((row, index) => (
                <TableRow key={index} sx={{ '&:hover': { background: 'rgba(99, 102, 241, 0.04)' } }}>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600, color: '#1e293b' }}>{getEmployeeName(row.employeeId)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ color: '#64748b' }}>{new Date(row.date).toLocaleDateString()}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={formatMinutesToHours(row.totalWorkMinutes || 0)}
                      size="small"
                      sx={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {row.isLate && (
                        <Chip label="Late" size="small" sx={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', fontSize: '0.7rem' }} />
                      )}
                      {row.hasMissedPunch && (
                        <Chip label="Missed Punch" size="small" sx={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', fontSize: '0.7rem' }} />
                      )}
                      {!row.isLate && !row.hasMissedPunch && (
                        <Chip label="Normal" size="small" sx={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', fontSize: '0.7rem' }} />
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'exceptions':
        return (
          <Table>
            <TableHead>
              <TableRow sx={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Employee</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reportData.data.map((row, index) => (
                <TableRow key={index} sx={{ '&:hover': { background: 'rgba(139, 92, 246, 0.04)' } }}>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600, color: '#1e293b' }}>{getEmployeeName(row.employeeId)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={row.type || 'N/A'}
                      size="small"
                      sx={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={row.status || 'N/A'}
                      size="small"
                      sx={{ 
                        background: row.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: row.status === 'APPROVED' ? '#10B981' : '#F59E0B'
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ color: '#64748b' }}>{new Date(row.createdAt).toLocaleDateString()}</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      default:
        return null;
    }
  };

  if (!canViewReports) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <AlertTriangle size={48} style={{ color: '#F59E0B', marginBottom: '16px' }} />
        <Typography variant="h6" sx={{ color: '#64748b' }}>You do not have permission to view reports</Typography>
      </Box>
    );
  }

  return (
    <Box className="tm-tab-content tm-fade-in">
      {/* Header Section */}
      <Box className="tm-section-header" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box className="tm-icon-badge tm-icon-badge-primary">
            <BarChart3 size={24} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
              Time Management Reports
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              Generate and analyze attendance, overtime, and lateness reports
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Report Type Tabs */}
      <Paper sx={{ mb: 3, borderRadius: '16px', overflow: 'hidden' }}>
        <Tabs
          value={reportType}
          onChange={(_, value) => {
            setReportType(value);
            setReportData(null);
          }}
          sx={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              minHeight: 56,
            },
            '& .Mui-selected': {
              color: '#6366F1 !important',
            },
            '& .MuiTabs-indicator': {
              background: 'var(--tm-gradient-primary)',
              height: 3,
            },
          }}
        >
          <Tab icon={<Clock size={18} />} iconPosition="start" label="Attendance" value="attendance" />
          <Tab icon={<TrendingUp size={18} />} iconPosition="start" label="Overtime" value="overtime" />
          <Tab icon={<AlertTriangle size={18} />} iconPosition="start" label="Lateness" value="lateness" />
          <Tab icon={<FileText size={18} />} iconPosition="start" label="Exceptions" value="exceptions" />
        </Tabs>
      </Paper>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: '16px' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b', mb: 2 }}>
          Report Filters
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <TextField
              fullWidth
              type="date"
              label="Start Date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <TextField
              fullWidth
              type="date"
              label="End Date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Department</InputLabel>
              <Select
                value={filters.departmentId}
                onChange={(e) => setFilters({ ...filters, departmentId: e.target.value })}
                label="Department"
              >
                <MenuItem value="">All Departments</MenuItem>
                {departments.map((dept) => (
                  <MenuItem key={dept._id} value={dept._id}>
                    {dept.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Employee</InputLabel>
              <Select
                value={filters.employeeId}
                onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}
                label="Employee"
              >
                <MenuItem value="">All Employees</MenuItem>
                {employees.map((emp) => (
                  <MenuItem key={emp._id} value={emp._id}>
                    {emp.fullName || `${emp.firstName} ${emp.lastName}`} ({emp.employeeNumber})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 12, md: 3 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                fullWidth
                variant="contained"
                onClick={generateReport}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Calendar size={18} />}
                sx={{
                  background: 'var(--tm-gradient-primary)',
                  borderRadius: '10px',
                  textTransform: 'none',
                  fontWeight: 600,
                  py: 1,
                }}
              >
                Generate
              </Button>
              {reportData && reportData.data.length > 0 && (
                <Button
                  variant="outlined"
                  onClick={exportToCSV}
                  sx={{
                    borderRadius: '10px',
                    textTransform: 'none',
                    fontWeight: 600,
                    py: 1,
                    borderColor: '#6366F1',
                    color: '#6366F1',
                    minWidth: '48px',
                  }}
                >
                  <Download size={18} />
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Summary Cards - Attendance Report */}
      {reportData && reportType === 'attendance' && reportData.summary && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 2, mb: 3 }}>
          <Card sx={{ borderRadius: '16px', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: '10px', background: 'linear-gradient(135deg, #6366F120 0%, #8B5CF620 100%)' }}>
                  <FileText size={18} style={{ color: '#6366F1' }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>{reportData.totalRecords}</Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>Total Records</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card sx={{ borderRadius: '16px', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: '10px', background: 'linear-gradient(135deg, #3B82F620 0%, #6366F120 100%)' }}>
                  <Users size={18} style={{ color: '#3B82F6' }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>{reportData.summary.uniqueEmployees || 0}</Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>Employees</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card sx={{ borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: '10px', background: 'linear-gradient(135deg, #10B98120 0%, #14B8A620 100%)' }}>
                  <Clock size={18} style={{ color: '#10B981' }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>{reportData.summary.totalWorkHours?.toFixed(1) || 0}h</Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>Total Hours</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card sx={{ borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: '10px', background: 'linear-gradient(135deg, #10B98120 0%, #22C55E20 100%)' }}>
                  <TrendingUp size={18} style={{ color: '#22C55E' }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>{reportData.summary.onTimePercentage || 0}%</Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>On-Time Rate</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card sx={{ borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: '10px', background: 'linear-gradient(135deg, #EF444420 0%, #F9731620 100%)' }}>
                  <AlertTriangle size={18} style={{ color: '#EF4444' }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>{reportData.summary.lateCount || 0}</Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>Late ({reportData.summary.latePercentage || 0}%)</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card sx={{ borderRadius: '16px', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: '10px', background: 'linear-gradient(135deg, #F59E0B20 0%, #F9731620 100%)' }}>
                  <Clock size={18} style={{ color: '#F59E0B' }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>{reportData.summary.missedPunchCount || 0}</Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>Missed Punches</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Summary Cards - Overtime Report */}
      {reportData && reportType === 'overtime' && reportData.summary && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2, mb: 3 }}>
          <Card sx={{ borderRadius: '16px', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: '10px', background: 'linear-gradient(135deg, #F59E0B20 0%, #F9731620 100%)' }}>
                  <TrendingUp size={20} style={{ color: '#F59E0B' }} />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>{reportData.summary.totalOvertimeHours?.toFixed(1) || 0}h</Typography>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>Total Overtime</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card sx={{ borderRadius: '16px', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: '10px', background: 'linear-gradient(135deg, #6366F120 0%, #8B5CF620 100%)' }}>
                  <Users size={20} style={{ color: '#6366F1' }} />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>{reportData.summary.employeesWithOvertime || 0}</Typography>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>Employees with OT</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card sx={{ borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: '10px', background: 'linear-gradient(135deg, #10B98120 0%, #14B8A620 100%)' }}>
                  <Clock size={20} style={{ color: '#10B981' }} />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>{reportData.summary.averageOvertimePerRecord || 0}m</Typography>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>Avg per Record</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card sx={{ borderRadius: '16px', border: '1px solid rgba(139, 92, 246, 0.1)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: '10px', background: 'linear-gradient(135deg, #8B5CF620 0%, #A855F720 100%)' }}>
                  <BarChart3 size={20} style={{ color: '#8B5CF6' }} />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>{reportData.summary.multiplier || 1.5}x</Typography>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>OT Multiplier</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Summary Cards - Lateness Report */}
      {reportData && reportType === 'lateness' && reportData.summary && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2, mb: 3 }}>
          <Card sx={{ borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: '10px', background: 'linear-gradient(135deg, #EF444420 0%, #F9731620 100%)' }}>
                  <AlertTriangle size={20} style={{ color: '#EF4444' }} />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>{reportData.totalRecords}</Typography>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>Late Arrivals</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card sx={{ borderRadius: '16px', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: '10px', background: 'linear-gradient(135deg, #6366F120 0%, #8B5CF620 100%)' }}>
                  <Users size={20} style={{ color: '#6366F1' }} />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>{reportData.summary.employeesLate || 0}</Typography>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>Employees Late</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card sx={{ borderRadius: '16px', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: '10px', background: 'linear-gradient(135deg, #F59E0B20 0%, #F9731620 100%)' }}>
                  <Clock size={20} style={{ color: '#F59E0B' }} />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>{reportData.summary.averageLateMinutes || 0}m</Typography>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>Avg Late Time</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card sx={{ borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: '10px', background: 'linear-gradient(135deg, #EF444420 0%, #DC262620 100%)' }}>
                  <AlertTriangle size={20} style={{ color: '#DC2626' }} />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>{reportData.summary.beyondGraceCount || 0}</Typography>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>Beyond Grace ({reportData.summary.gracePeriodMinutes || 15}m)</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Summary Cards - Exceptions Report */}
      {reportData && reportType === 'exceptions' && reportData.summary && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2, mb: 3 }}>
          <Card sx={{ borderRadius: '16px', border: '1px solid rgba(139, 92, 246, 0.1)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: '10px', background: 'linear-gradient(135deg, #8B5CF620 0%, #A855F720 100%)' }}>
                  <FileText size={20} style={{ color: '#8B5CF6' }} />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>{reportData.totalRecords}</Typography>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>Total Exceptions</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card sx={{ borderRadius: '16px', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: '10px', background: 'linear-gradient(135deg, #6366F120 0%, #8B5CF620 100%)' }}>
                  <Users size={20} style={{ color: '#6366F1' }} />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>{reportData.summary.employeesWithExceptions || 0}</Typography>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>Employees</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card sx={{ borderRadius: '16px', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: '10px', background: 'linear-gradient(135deg, #F59E0B20 0%, #F9731620 100%)' }}>
                  <Clock size={20} style={{ color: '#F59E0B' }} />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>{reportData.summary.openCount || 0}</Typography>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>Open</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card sx={{ borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: '10px', background: 'linear-gradient(135deg, #10B98120 0%, #14B8A620 100%)' }}>
                  <TrendingUp size={20} style={{ color: '#10B981' }} />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>{reportData.summary.resolvedCount || 0}</Typography>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>Resolved</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Report Table */}
      <TableContainer component={Paper} className="tm-table-container" sx={{ borderRadius: '16px', overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
            <CircularProgress sx={{ color: 'var(--tm-primary)' }} />
          </Box>
        ) : (
          renderReportTable()
        )}
      </TableContainer>
    </Box>
  );
}
