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
}

const variantStyles: Record<KpiVariant, { iconBg: string; iconText: string }> = {
  primary: { iconBg: 'bg-indigo-50', iconText: 'text-indigo-600' },
  success: { iconBg: 'bg-green-50', iconText: 'text-green-500' },
  warning: { iconBg: 'bg-amber-50', iconText: 'text-amber-500' },
  info: { iconBg: 'bg-sky-50', iconText: 'text-sky-500' },
};

const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  icon,
  variant = 'primary',
  trendText,
  onClick,
  loading,
}) => {
  const styles = variantStyles[variant];
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`w-full rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md ${
        onClick ? 'cursor-pointer active:scale-[0.98]' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${styles.iconBg} ${styles.iconText}`}>
          {icon}
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
