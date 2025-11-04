// User roles
export type UserRole = 'counselor' | 'admin' | 'leader';

// User interface
export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
  deactivatedAt?: Date;
}

// Counselor interface
export interface Counselor {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  specialties: string[]; // What kind of problems they're good at
  activeCases: number;
  workloadLevel: 'low' | 'moderate' | 'high';
  linkedUserId?: string; // Link to user account from admin tools
  createdAt: Date;
  updatedAt: Date;
}

// Case status
export type CaseStatus = 'waiting' | 'active' | 'unfinished' | 'finished' | 'cancelled';

// Issue types
export type IssueType = 'spiritual' | 'relational' | 'personal';

// Civil status
export type CivilStatus = 'unmarried' | 'married' | 'divorced' | 'engaged' | 'widowed';

// Case interface
export interface Case {
  id: string;
  title: string;
  counseledName: string;
  age: number;
  civilStatus: CivilStatus;
  issueTypes: IssueType[];
  phoneNumber: string;
  description: string;
  status: CaseStatus;
  assignedCounselorId?: string;
  assignedCounselorName?: string;
  meetingFeedback?: string; // Notes from counseling sessions
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // User ID who created the case
}

// Session report interface
export interface SessionReport {
  id: string;
  caseId: string;
  counselorId: string;
  counselorName: string;
  date: Date;
  notes: string;
  progress: string;
  nextSteps: string;
  prayerRequests?: string;
  createdAt: Date;
}

// Appointment interface
export interface Appointment {
  id: string;
  title: string;
  description?: string;
  date: Date;
  startTime: string;
  endTime: string;
  counselorId: string;
  counselorName: string;
  caseId?: string; // Optional link to a case
  caseTitle?: string;
  room?: string; // Church room where counseling will take place
  createdBy: string;
  createdAt: Date;
}

// Dashboard metrics
export interface DashboardMetrics {
  totalCases: number;
  casesByStatus: {
    waiting: number;
    active: number;
    unfinished: number;
    finished: number;
  };
  totalCounselors: number;
  counselorWorkload: {
    low: number;
    moderate: number;
    high: number;
  };
  upcomingAppointments: number;
  recentActivity: ActivityItem[];
}

// Activity item for dashboard
export interface ActivityItem {
  id: string;
  type: 'case_created' | 'case_updated' | 'case_assigned' | 'session_added' | 'appointment_scheduled';
  description: string;
  timestamp: Date;
  userId: string;
  userName: string;
}
