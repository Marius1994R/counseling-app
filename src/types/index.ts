// User roles
export type UserRole = 'counselor' | 'admin' | 'leader';

// Issue types
export type IssueType = 'spiritual' | 'relational' | 'personal';

// User interface
export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  avatarUrl?: string;
  createdAt: Date;
  lastLogin?: Date;
  deactivatedAt?: Date;
}

// Counselor interface
export interface Counselor {
  id: string;
  fullName: string;
  /** Prenume */
  firstName?: string;
  /** Nume de familie */
  lastName?: string;
  email: string;
  phoneNumber: string;
  /** Used for propose-by-default when matching counselee sex */
  sex?: Sex;
  birthDate?: Date | null;
  specialties: string[]; // What kind of problems they're good at
  /** Custom specialty name → issue category (COMMON_SPECIALTIES use static map) */
  specialtyCategories?: Record<string, IssueType>;
  activeCases: number;
  workloadLevel: 'low' | 'moderate' | 'high';
  linkedUserId?: string; // Link to user account from admin tools
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Case status
export type CaseStatus = 'waiting' | 'active' | 'unfinished' | 'finished' | 'cancelled';

/** Assignment proposal lifecycle for intake workflow */
export type AssignmentStatus = 'none' | 'pending' | 'accepted' | 'forced';

// Civil status
export type CivilStatus = 'unmarried' | 'married' | 'divorced' | 'engaged' | 'widowed';

// Sex/Gender
export type Sex = 'masculin' | 'feminin';

/** How the counselee was referred (optional intake) */
export type ReferralSource = 'pastor' | 'self' | 'friend' | 'other';

/** Intake priority for triage visibility */
export type CasePriority = 'normal' | 'high';

/** Meeting cadence in weeks: 1=weekly, 2=biweekly, 3=every 3 weeks, 4=monthly */
export type MeetingFrequencyWeeks = 1 | 2 | 3 | 4;

// Case interface
export interface Case {
  id: string;
  title: string;
  /** Display name (Prenume Nume); kept for legacy reads/UI */
  counseledName: string;
  /** Prenume */
  firstName?: string;
  /** Nume de familie */
  lastName?: string;
  age: number;
  sex?: Sex; // Optional for backward compatibility
  civilStatus: CivilStatus;
  issueTypes: IssueType[];
  phoneNumber: string;
  description: string;
  /** Optional: pastor / self / friend / other */
  referralSource?: ReferralSource | null;
  /** Defaults to normal when missing (legacy cases) */
  priority?: CasePriority;
  status: CaseStatus;
  assignedCounselorId?: string;
  assignedCounselorName?: string;
  assignmentStatus?: AssignmentStatus;
  proposedCounselorId?: string | null;
  proposedCounselorName?: string | null;
  /** User who proposed the counselor (leader/admin) — used for accept/refuse notifications */
  proposedByUserId?: string | null;
  proposedByUserName?: string | null;
  meetingFeedback?: string; // Notes from counseling sessions
  /** Agreed meeting cadence in weeks (1=weekly, 2=biweekly, 3=every 3 weeks, 4=monthly) */
  meetingFrequencyWeeks?: MeetingFrequencyWeeks | null;
  /** Date of the last recorded session meeting (from session reports) */
  lastMeetingDate?: Date | null;
  /** True when a counseling consent file is attached (Phase 2+ writes this) */
  consentAttached?: boolean;
  consentFileName?: string | null;
  consentContentType?: string | null;
  consentUploadedAt?: Date | null;
  consentUploadedByName?: string | null;
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

// Church event (Eveniment) — separate from counseling appointments
export interface ChurchEvent {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
  registrationUrl?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Marital status for monthly accountability report */
export type MonthlyReportMaritalStatus = 'casatorit' | 'necasatorit';

/** Answers for the monthly dare-de-socoteală form */
export interface MonthlyReportAnswers {
  relationshipWithGod: string;
  mostAliveDiscipline: string;
  disciplineNeedsStrengthening: string;
  maritalStatus: MonthlyReportMaritalStatus;
  marriageFamilyNotes: string;
  closeRelationshipsNotes: string;
  needsPersonalRelationshipSupport: string;
  heartState: string;
  feelsTiredOrBurdened: string;
  howLeaderOrTeamCanHelp: string;
  departmentImprovements: string;
}

/** Monthly accountability report (Raport lunar) */
export interface MonthlyReport {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  monthKey: string; // YYYY-MM of the reported month
  answers: MonthlyReportAnswers;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
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

/** External resource link kind (Google Docs/Sheets/other) */
export type ResourceLinkKind = 'doc' | 'sheet' | 'other';

/** Preset accent color for a resource folder icon */
export type ResourceFolderColor =
  | 'brand'
  | 'slate'
  | 'sky'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'violet'
  | 'orange';

/** Folder in the department resources tree */
export interface ResourceFolder {
  id: string;
  name: string;
  parentId: string | null;
  allowAdmins: boolean;
  allowCounselors: boolean;
  color: ResourceFolderColor;
  sortOrder: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/** External URL link inside a resource folder */
export interface ResourceLink {
  id: string;
  folderId: string;
  title: string;
  url: string;
  kind: ResourceLinkKind;
  sortOrder: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

