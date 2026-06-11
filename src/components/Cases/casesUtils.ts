import { CaseStatus } from '../../types';
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
