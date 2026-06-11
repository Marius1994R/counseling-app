import React from 'react';

type KpiVariant = 'primary' | 'success' | 'warning' | 'info';

interface KpiCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  variant?: KpiVariant;
  trendText?: string;
  onClick?: () => void;
  loading?: boolean;
  /** Shows an unread-style badge on the icon when greater than 0 */
  badgeCount?: number;
}

const variantStyles: Record<
  KpiVariant,
  { iconBg: string; iconText: string; badgeBg: string }
> = {
  primary: { iconBg: 'bg-brand-50', iconText: 'text-brand-600', badgeBg: 'bg-brand-600' },
  success: { iconBg: 'bg-green-50', iconText: 'text-green-500', badgeBg: 'bg-green-600' },
  warning: { iconBg: 'bg-amber-50', iconText: 'text-amber-500', badgeBg: 'bg-amber-500' },
  info: { iconBg: 'bg-sky-50', iconText: 'text-sky-500', badgeBg: 'bg-sky-600' },
};

const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  icon,
  variant = 'primary',
  trendText,
  onClick,
  loading,
  badgeCount = 0,
}) => {
  const styles = variantStyles[variant];
  const Tag = onClick ? 'button' : 'div';
  const showBadge = !loading && badgeCount > 0;

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`w-full rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md ${
        onClick ? 'cursor-pointer active:scale-[0.98]' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="relative">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${styles.iconBg} ${styles.iconText}`}
          >
            {icon}
          </div>
          {showBadge && (
            <span
              className={`absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full border-2 border-white px-1 text-[10px] font-bold leading-none text-white shadow-sm ${styles.badgeBg}`}
              aria-hidden="true"
            >
              {badgeCount > 9 ? '9+' : badgeCount}
            </span>
          )}
        </div>
      </div>
      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      {loading ? (
        <div className="mt-2 h-9 w-16 animate-pulse rounded bg-slate-100" />
      ) : (
        <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
      )}
      {trendText && <p className="mt-2 text-xs text-slate-500">{trendText}</p>}
    </Tag>
  );
};

export default KpiCard;
