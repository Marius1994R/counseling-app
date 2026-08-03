export type TimeRangeFilter = '3months' | '6months' | '9months' | 'alltime';

export function getCutoffDate(range: TimeRangeFilter): Date {
  const now = new Date();
  switch (range) {
    case '6months': {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 6);
      return d;
    }
    case '9months': {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 9);
      return d;
    }
    case 'alltime':
      return new Date(0);
    case '3months':
    default: {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      return d;
    }
  }
}
