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
      className={`w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md ${
        onClick ? 'cursor-pointer active:scale-[0.98]' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-md ${styles.iconBg} ${styles.iconText}`}
          >
            {icon}
          </div>
          {showBadge && (
            <span
              className={`absolute -right-1 -top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full border-2 border-white px-0.5 text-[9px] font-bold leading-none text-white shadow-sm ${styles.badgeBg}`}
              aria-hidden="true"
            >
              {badgeCount > 9 ? '9+' : badgeCount}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          {loading ? (
            <div className="mt-1 h-6 w-10 animate-pulse rounded bg-slate-100" />
          ) : (
            <p className="text-xl font-bold leading-tight text-slate-900">{value}</p>
          )}
          {trendText && (
            <p className="mt-0.5 truncate text-[11px] text-slate-500">{trendText}</p>
          )}
        </div>
      </div>
    </Tag>
  );
};

export default KpiCard;
