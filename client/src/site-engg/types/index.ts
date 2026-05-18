export type UserRole = 'admin' | 'engineer' | 'hr' | 'client';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  designation?: string;
  engineerId?: string;
  clientId?: string;
  createdAt: string;
  todayCheckIn?: string;
  todayCheckOut?: string;
  todayLocation?: string;
}

export interface EmailNotification {
  to: string[];
  subject: string;
  html: string;
  text?: string;
}

export interface Engineer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  designation?: string;
  specialization?: string;
  status: 'available' | 'on-leave' | 'assigned';
  userId: string;
  createdAt: string;
}

export interface EmailNotification {
  to: string[];
  subject: string;
  html: string;
  text?: string;
}

export interface Client {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone?: string;
  userId: string;
  createdAt: string;
}

export interface EmailNotification {
  to: string[];
  subject: string;
  html: string;
  text?: string;
}

export interface Site {
  id: string;
  clientId: string;
  name: string;
  location: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface EmailNotification {
  to: string[];
  subject: string;
  html: string;
  text?: string;
}

export interface Assignment {
  id: string;
  engineerId: string;
  engineerName?: string;
  engineerDesignation?: string;
  clientId: string;
  clientName?: string;
  siteId: string;
  siteName?: string;
  startDate?: string;
  assignedDate?: string;
  endDate?: string;
  status?: 'active' | 'completed' | 'inactive';
  createdAt: string;
}

export interface EmailNotification {
  to: string[];
  subject: string;
  html: string;
  text?: string;
}

export interface CheckIn {
  id: string;
  engineerId: string;
  engineerName?: string;
  siteId?: string;
  checkInTime: string;
  checkOutTime?: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  date: string;
  createdAt: string;
}

export interface EmailNotification {
  to: string[];
  subject: string;
  html: string;
  text?: string;
}

export interface DailyReport {
  id: string;
  engineerId: string;
  engineerName?: string;
  clientId: string;
  clientName?: string;
  siteId?: string;
  date: string;
  workDone: string;
  issues?: string;
  hoursWorked?: number;
  createdAt: string;
}

export interface EmailNotification {
  to: string[];
  subject: string;
  html: string;
  text?: string;
}

export interface LeaveRequest {
  id: string;
  engineerId: string;
  engineerName?: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  backupEngineerId?: string;
  backupEngineerName?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface EmailNotification {
  to: string[];
  subject: string;
  html: string;
  text?: string;
}
