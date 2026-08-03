import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { Case, CaseStatus, IssueType } from '../../types';
import { db } from '../../firebase';
import { getCaseDisplayId, getInitials, getStatusLabel } from '../Dashboard/dashboardUtils';
import { t } from '../../utils/translations';

export { getCaseDisplayId, getInitials, getStatusLabel };

export const CASE_STATUS_FILTERS = ['waiting', 'active', 'unfinished', 'finished', 'cancelled'] as const;

export function getStatusFilterFromUrl(searchParams: URLSearchParams): CaseStatus | 'all' {
  const status = searchParams.get('status');
  if (status === 'all') return 'all';
  if (status && CASE_STATUS_FILTERS.includes(status as CaseStatus)) {
    return status as CaseStatus;
  }
  return 'active';
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  active: 'bg-green-50 text-green-700',
  waiting: 'bg-amber-50 text-amber-700',
  finished: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-slate-100 text-slate-600',
  unfinished: 'bg-red-50 text-red-700',
};

export function getStatusBadgeClass(status: CaseStatus): string {
  return STATUS_BADGE_CLASS[status] ?? 'bg-slate-100 text-slate-600';
}

export function translateSex(sex?: string, age?: number): string {
  if (!sex) return '';
  const isAdult = age !== undefined && age > 17;
  if (sex === 'masculin') {
    return isAdult ? t.cases.sexMasculinAdult : t.cases.sexMasculinMinor;
  }
  if (sex === 'feminin') {
    return isAdult ? t.cases.sexFemininAdult : t.cases.sexFemininMinor;
  }
  return '';
}

export function translateCivilStatus(status: string, sex?: string): string {
  const isFeminin = sex === 'feminin';
  const statusLower = status.toLowerCase();

  if (isFeminin && t.civilStatus.feminin) {
    const femininTranslations = t.civilStatus.feminin as Record<string, string>;
    if (femininTranslations[statusLower]) {
      return femininTranslations[statusLower];
    }
  } else if (!isFeminin && t.civilStatus.masculin) {
    const masculinTranslations = t.civilStatus.masculin as Record<string, string>;
    if (masculinTranslations[statusLower]) {
      return masculinTranslations[statusLower];
    }
  }

  const translations: Record<string, string> = {
    unmarried: t.civilStatus.unmarried,
    single: t.civilStatus.single,
    married: t.civilStatus.married,
    divorced: t.civilStatus.divorced,
    engaged: t.civilStatus.engaged,
    widowed: t.civilStatus.widowed,
  };
  return translations[statusLower] || status;
}

export const AVATAR_COLORS = [
  'bg-brand-100 text-brand-600',
  'bg-amber-100 text-amber-700',
  'bg-green-100 text-green-700',
  'bg-sky-100 text-sky-700',
];

export function getAvatarColorClass(name: string): string {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

const ISSUE_TYPE_BADGE_CLASS: Record<IssueType, string> = {
  personal: 'bg-slate-100 text-slate-700',
  relational: 'bg-sky-50 text-sky-700',
  spiritual: 'bg-violet-50 text-violet-700',
};

export function translateIssueType(issueType: IssueType): string {
  const labels: Record<IssueType, string> = {
    personal: t.issueTypes.personal,
    relational: t.issueTypes.relational,
    spiritual: t.issueTypes.spiritual,
  };
  return labels[issueType] || issueType;
}

export function getIssueTypeBadgeClass(issueType: IssueType): string {
  return ISSUE_TYPE_BADGE_CLASS[issueType] ?? 'bg-slate-100 text-slate-600';
}

export async function loadVisibleCasesForUser(userId: string): Promise<Case[]> {
  let counselorId: string | null = null;
  const counselorsRef = collection(db, 'counselors');
  const counselorsQuery = query(counselorsRef, where('linkedUserId', '==', userId));
  const counselorsSnapshot = await getDocs(counselorsQuery);

  if (!counselorsSnapshot.empty) {
    counselorId = counselorsSnapshot.docs[0].id;
  }

  const casesRef = collection(db, 'cases');
  const casesQuery = query(casesRef, orderBy('createdAt', 'desc'));
  const casesSnapshot = await getDocs(casesQuery);

  const casesData: Case[] = [];
  casesSnapshot.forEach((caseDoc) => {
    const data = caseDoc.data();
    const caseItem: Case = {
      id: caseDoc.id,
      title: data.title,
      counseledName: data.counseledName,
      age: data.age,
      sex: data.sex,
      civilStatus: data.civilStatus,
      issueTypes: data.issueTypes || [],
      phoneNumber: data.phoneNumber || '',
      description: data.description,
      status: data.status,
      assignedCounselorId: data.assignedCounselorId,
      assignedCounselorName: data.assignedCounselorName,
      meetingFeedback: data.meetingFeedback || '',
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
      createdBy: data.createdBy || '',
    };

    const shouldInclude = counselorId
      ? caseItem.assignedCounselorId === counselorId
      : caseItem.assignedCounselorId === userId;

    if (shouldInclude) {
      casesData.push(caseItem);
    }
  });

  return casesData;
}
