import React from 'react';
import { SessionReportRecord, getTaskCompletedLabel } from './sessionReportsUtils';
import { t } from '../../utils/translations';

interface SessionReportDetailCardProps {
  report: SessionReportRecord;
  className?: string;
  isOpeningSession?: boolean;
}

const SessionReportDetailCard: React.FC<SessionReportDetailCardProps> = ({
  report,
  className = '',
  isOpeningSession = false,
}) => (
  <div className={`space-y-3 border-t border-slate-200 pt-4 ${className}`}>
    <p className="text-sm font-semibold text-slate-900">{t.sessionReports.reportDetails}</p>

    <div>
      <p className="text-xs font-medium text-slate-500">{t.sessionReports.fields.mainTheme}</p>
      <p className="text-sm text-slate-800">{report.mainTheme}</p>
    </div>

    <div>
      <p className="text-xs font-medium text-slate-500">{t.sessionReports.fields.personResponse}</p>
      <p className="text-sm text-slate-800">{report.personResponse}</p>
    </div>

    {!isOpeningSession && (
    <>
    <div>
      <p className="text-xs font-medium text-slate-500">{t.sessionReports.fields.previousTask}</p>
      <p className="text-sm capitalize text-slate-800">
        {getTaskCompletedLabel(report.previousTaskCompleted)}
      </p>
      {(report.previousTaskCompleted === 'partial' || report.previousTaskCompleted === 'no') &&
        report.previousTaskNotCompletedReason && (
          <p className="mt-1 pl-2 text-sm italic text-slate-600">
            {t.sessionReports.fields.reason}: {report.previousTaskNotCompletedReason}
          </p>
        )}
    </div>

    <div>
      <p className="text-xs font-medium text-slate-500">{t.sessionReports.fields.progress}</p>
      <p className="text-sm text-slate-800">{report.progressNoted}</p>
    </div>
    </>
    )}

    <div>
      <p className="text-xs font-medium text-slate-500">{t.sessionReports.fields.commitments}</p>
      <p className="text-sm capitalize text-slate-800">
        {report.nextCommitments === 'yes' ? t.common.yes : t.common.no}
      </p>
      {report.nextCommitments === 'yes' && report.nextCommitmentsDetails && (
        <p className="mt-1 text-sm italic text-slate-600">{report.nextCommitmentsDetails}</p>
      )}
      {report.nextCommitments === 'no' && report.noCommitmentsReason && (
        <p className="mt-1 text-sm italic text-slate-600">
          {t.sessionReports.fields.reason}: {report.noCommitmentsReason}
        </p>
      )}
    </div>
  </div>
);

export default SessionReportDetailCard;
