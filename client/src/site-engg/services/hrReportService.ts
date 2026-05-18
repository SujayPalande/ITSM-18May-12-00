import type { CheckIn } from '../types';

const API_BASE = '/api/site-engg';

async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export interface AttendanceRecord {
  date: string;
  engineerId: string;
  engineerName: string;
  status: 'present' | 'absent' | 'leave';
  checkInTime?: string;
  checkOutTime?: string;
  hoursWorked?: number;
  site?: string;
}

export interface EngineerSummary {
  engineerId: string;
  engineerName: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  totalHours: number;
  averageHoursPerDay: number;
}

export interface ClientReport {
  clientId: string;
  clientName: string;
  totalAssignments: number;
  activeEngineers: number;
  totalCheckIns: number;
  totalReports: number;
  sitesCount: number;
}

export interface BackupUsage {
  totalBackups: number;
  storageUsedMB: number;
  avgBackupSizeMB: number;
  lastBackupDate: string;
}

export interface PayrollRecord {
  engineerId: string;
  engineerName: string;
  email: string;
  phone: string;
  workingDays: number;
  totalHours: number;
  leaveDays: number;
  overtimeHours: number;
}

const calculateHoursWorked = (checkIn: CheckIn): number => {
  if (!checkIn.checkInTime || !checkIn.checkOutTime) return 0;
  const checkInDate = new Date(checkIn.checkInTime);
  const checkOutDate = new Date(checkIn.checkOutTime);
  const hours = (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60);
  return Math.max(0, hours);
};

export const hrReportService = {
  async getDailyAttendanceRegister(date: string): Promise<AttendanceRecord[]> {
    const engineers = await apiRequest('/engineers');
    const checkIns = await apiRequest('/check-ins');
    const leaves = await apiRequest('/leaves');

    const dailyCheckIns = checkIns.filter((c: any) => c.date === date);
    const dailyLeaves = leaves.filter((l: any) => {
      return l.status === 'approved' && date >= l.startDate && date <= l.endDate;
    });

    const records: AttendanceRecord[] = engineers.map((engineer: any) => {
      const engineerId = engineer.id;
      const checkIn = dailyCheckIns.find((c: any) => c.engineerId === engineerId);
      const onLeave = dailyLeaves.find((l: any) => l.engineerId === engineerId);

      if (checkIn) {
        return {
          date,
          engineerId,
          engineerName: engineer.fullName || engineer.name || 'Engineer',
          status: 'present',
          checkInTime: checkIn.checkInTime,
          checkOutTime: checkIn.checkOutTime,
          hoursWorked: calculateHoursWorked(checkIn),
          site: checkIn.locationName
        } as AttendanceRecord;
      } else if (onLeave) {
        return {
          date,
          engineerId,
          engineerName: engineer.fullName || engineer.name || 'Engineer',
          status: 'leave'
        } as AttendanceRecord;
      } else {
        return {
          date,
          engineerId,
          engineerName: engineer.fullName || engineer.name || 'Engineer',
          status: 'absent'
        } as AttendanceRecord;
      }
    });

    return records;
  },

  async getWeeklyEngineerSummary(startDate: string, endDate: string): Promise<EngineerSummary[]> {
    const engineers = await apiRequest('/engineers');
    const checkIns = await apiRequest('/check-ins');
    const leaves = await apiRequest('/leaves');

    const weekCheckIns = checkIns.filter((c: any) => c.date >= startDate && c.date <= endDate);
    const weekLeaves = leaves.filter((l: any) => {
      return l.status === 'approved' &&
             ((l.startDate >= startDate && l.startDate <= endDate) ||
              (l.endDate >= startDate && l.endDate <= endDate) ||
              (l.startDate <= startDate && l.endDate >= endDate));
    });

    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const summaries: EngineerSummary[] = engineers.map((engineer: any) => {
      const engineerId = engineer.id;
      const engineerCheckIns = weekCheckIns.filter((c: any) => c.engineerId === engineerId);
      const engineerLeaves = weekLeaves.filter((l: any) => l.engineerId === engineerId);

      const presentDays = new Set(engineerCheckIns.map((c: any) => c.date)).size;

      const leaveDays = engineerLeaves.reduce((sum: number, leave: any) => {
        const leaveStart = new Date(leave.startDate > startDate ? leave.startDate : startDate);
        const leaveEnd = new Date(leave.endDate < endDate ? leave.endDate : endDate);
        return sum + Math.ceil((leaveEnd.getTime() - leaveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      }, 0);

      const absentDays = totalDays - presentDays - leaveDays;

      const totalHours = engineerCheckIns.reduce((sum: number, checkIn: CheckIn) =>
        sum + calculateHoursWorked(checkIn), 0
      );

      return {
        engineerId,
        engineerName: engineer.fullName || engineer.name || '',
        totalDays,
        presentDays,
        absentDays: Math.max(0, absentDays),
        leaveDays,
        totalHours: Math.round(totalHours * 100) / 100,
        averageHoursPerDay: presentDays > 0 ? Math.round((totalHours / presentDays) * 100) / 100 : 0
      };
    });

    return summaries;
  },

  async getMonthlyClientReport(month: string): Promise<ClientReport[]> {
    const clients = await apiRequest('/clients');
    const assignments = await apiRequest('/assignments');
    const checkIns = await apiRequest('/check-ins');
    const reports = await apiRequest('/reports');
    const sites = await apiRequest('/sites');

    const startOfMonth = month + '-01';
    const lastDay = new Date(new Date(month).getFullYear(), new Date(month).getMonth() + 1, 0).getDate();
    const endOfMonth = month + '-' + (lastDay < 10 ? '0' + lastDay : lastDay);

    const monthCheckIns = checkIns.filter((c: any) => c.date >= startOfMonth && c.date <= endOfMonth);
    const monthReports = reports.filter((r: any) => r.date >= startOfMonth && r.date <= endOfMonth);

    const clientReports: ClientReport[] = (clients || []).map((client: any) => {
      const clientSites = (sites || []).filter((s: any) => s.clientId === client.id);
      const clientAssignments = assignments.filter((a: any) => a.clientId === client.id);

      const activeEngineers = new Set(
        clientAssignments
          .filter((a: any) => a.status === 'active')
          .map((a: any) => a.engineerId)
      ).size;

      const clientCheckIns = monthCheckIns.filter((c: any) =>
        clientSites.some((s: any) => s.id === c.siteId) || clientAssignments.some((a: any) => a.engineerId === c.engineerId)
      );

      const clientReportsList = monthReports.filter((r: any) =>
        r.clientId === client.id || clientAssignments.some((a: any) => a.engineerId === r.engineerId)
      );

      return {
        clientId: client.id,
        clientName: client.name,
        totalAssignments: clientAssignments.length,
        activeEngineers,
        totalCheckIns: clientCheckIns.length,
        totalReports: clientReportsList.length,
        sitesCount: clientSites.length
      };
    });

    return clientReports;
  },

  async getBackupUsage(): Promise<BackupUsage> {
    return {
      totalBackups: 0,
      storageUsedMB: 0,
      avgBackupSizeMB: 0,
      lastBackupDate: 'N/A - Database backed'
    };
  },

  async getPayrollData(month: string): Promise<PayrollRecord[]> {
    const engineers = await apiRequest('/engineers');
    const checkIns = await apiRequest('/check-ins');
    const leaves = await apiRequest('/leaves');

    const startOfMonth = month + '-01';
    const lastDay = new Date(new Date(month).getFullYear(), new Date(month).getMonth() + 1, 0).getDate();
    const endOfMonth = month + '-' + (lastDay < 10 ? '0' + lastDay : lastDay);

    const monthCheckIns = checkIns.filter((c: any) => c.date >= startOfMonth && c.date <= endOfMonth);
    const monthLeaves = leaves.filter((l: any) => {
      return l.status === 'approved' &&
             ((l.startDate >= startOfMonth && l.startDate <= endOfMonth) ||
              (l.endDate >= startOfMonth && l.endDate <= endOfMonth) ||
              (l.startDate <= startOfMonth && l.endDate >= endOfMonth));
    });

    const payrollRecords: PayrollRecord[] = engineers.map((engineer: any) => {
      const engineerId = engineer.id;
      const engineerCheckIns = monthCheckIns.filter((c: any) => c.engineerId === engineerId);
      const engineerLeaves = monthLeaves.filter((l: any) => l.engineerId === engineerId);

      const workingDays = new Set(engineerCheckIns.map((c: any) => c.date)).size;

      const totalHours = engineerCheckIns.reduce((sum: number, checkIn: CheckIn) =>
        sum + calculateHoursWorked(checkIn), 0
      );

      const leaveDays = engineerLeaves.reduce((sum: number, leave: any) => {
        const leaveStart = new Date(leave.startDate > startOfMonth ? leave.startDate : startOfMonth);
        const leaveEnd = new Date(leave.endDate < endOfMonth ? leave.endDate : endOfMonth);
        return sum + Math.ceil((leaveEnd.getTime() - leaveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      }, 0);

      const standardHoursPerDay = 8;
      const overtimeHours = Math.max(0, totalHours - (workingDays * standardHoursPerDay));

      return {
        engineerId,
        engineerName: engineer.fullName || engineer.name || '',
        email: engineer.email || '',
        phone: engineer.phone || '',
        workingDays,
        totalHours: Math.round(totalHours * 100) / 100,
        leaveDays,
        overtimeHours: Math.round(overtimeHours * 100) / 100
      };
    });

    return payrollRecords;
  },

  exportPayrollToCSV(payrollData: PayrollRecord[], _month: string): string {
    const headers = [
      'Employee ID', 'Employee Name', 'Email', 'Phone',
      'Working Days', 'Total Hours', 'Leave Days', 'Overtime Hours'
    ];

    const rows = payrollData.map(record => [
      record.engineerId, record.engineerName, record.email, record.phone,
      record.workingDays.toString(), record.totalHours.toString(),
      record.leaveDays.toString(), record.overtimeHours.toString()
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  },

  downloadCSV(csvContent: string, filename: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
