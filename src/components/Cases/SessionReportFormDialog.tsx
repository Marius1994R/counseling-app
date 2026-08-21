import React, { useEffect, useState } from 'react';
import { CircularProgress } from '@mui/material';
import { MeetingFrequencyWeeks } from '../../types';
import { t } from '../../utils/translations';
import {
  MEETING_FREQUENCY_OPTIONS,
  meetingFrequencyLabel,
} from '../../utils/meetingFrequency';

function todayDateInputValue(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const STEPS = [
  t.sessionReports.wizard.stepContext,
  t.sessionReports.wizard.stepTheme,
  t.sessionReports.wizard.stepProgress,
] as const;

export interface SessionReportFormValues {
  sessionNumber: number;
  meetingDate: string;
  meetingFrequencyWeeks: MeetingFrequencyWeeks | '';
  mainTheme: string;
  personResponse: string;
  previousTaskCompleted: 'yes' | 'no' | 'partial';
  previousTaskNotCompletedReason: string;
  progressNoted: string;
  nextCommitments: 'yes' | 'no';
  nextCommitmentsDetails: string;
  noCommitmentsReason: string;
}

interface SessionReportFormDialogProps {
  open: boolean;
  caseTitle: string;
  loading: boolean;
  frequencyRequired: boolean;
  values: SessionReportFormValues;
  onChange: (patch: Partial<SessionReportFormValues>) => void;
  onClose: () => void;
  onSubmit: () => void;
}

function ChipOption(props: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={props.onClick}
      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
        props.active
          ? 'border-brand-600 bg-brand-50 text-brand-800'
          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      {props.label}
    </button>
  );
}

function StepDots(props: { active: number }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {STEPS.map((label, i) => {
        const active = i === props.active;
        const done = i < props.active;
        return (
          <React.Fragment key={label}>
            <div className="flex items-center gap-1.5">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  active
                    ? 'bg-brand-600 text-white'
                    : done
                      ? 'border border-brand-600 bg-brand-50 text-brand-800'
                      : 'border border-slate-200 bg-slate-50 text-slate-500'
                }`}
              >
                {i + 1}
              </span>
              <span
                className={`text-xs sm:text-sm ${
                  active ? 'font-semibold text-slate-900' : 'text-slate-500'
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span className="hidden h-px w-4 bg-slate-200 sm:block" aria-hidden />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:opacity-50 sm:text-sm';

const SessionReportFormDialog: React.FC<SessionReportFormDialogProps> = ({
  open,
  caseTitle,
  loading,
  frequencyRequired,
  values,
  onChange,
  onClose,
  onSubmit,
}) => {
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState('');

  useEffect(() => {
    if (open) {
      setStep(0);
      setStepError('');
    }
  }, [open]);

  if (!open) return null;

  const validateStep = (index: number): string | null => {
    if (index === 0) {
      if (!values.meetingDate.trim()) {
        return t.sessionReports.meetingDateRequired;
      }
      if (frequencyRequired && values.meetingFrequencyWeeks === '') {
        return t.sessionReports.meetingFrequencyRequired;
      }
      return null;
    }
    if (index === 1) {
      if (!values.mainTheme.trim() || !values.personResponse.trim()) {
        return t.sessionReports.wizard.requiredFields;
      }
      if (
        (values.previousTaskCompleted === 'partial' ||
          values.previousTaskCompleted === 'no') &&
        !values.previousTaskNotCompletedReason.trim()
      ) {
        return t.sessionReports.wizard.previousTaskReasonRequired;
      }
      return null;
    }
    if (index === 2) {
      if (!values.progressNoted.trim()) {
        return t.sessionReports.wizard.requiredFields;
      }
      if (
        values.nextCommitments === 'yes' &&
        !values.nextCommitmentsDetails.trim()
      ) {
        return t.sessionReports.wizard.commitmentsDetailsRequired;
      }
      if (
        values.nextCommitments === 'no' &&
        !values.noCommitmentsReason.trim()
      ) {
        return t.sessionReports.wizard.noCommitmentsReasonRequired;
      }
      return null;
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep(step);
    if (err) {
      setStepError(err);
      return;
    }
    setStepError('');
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setStepError('');
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleSubmit = () => {
    const err = validateStep(2);
    if (err) {
      setStepError(err);
      return;
    }
    setStepError('');
    onSubmit();
  };

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  const canProceed = validateStep(step) === null;

  return (
    <div
      className="fixed inset-0 z-[1400] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-report-form-title"
    >
      <div
        className="absolute inset-0 bg-slate-900/40"
        aria-hidden="true"
        onClick={handleClose}
      />
      <div className="relative flex h-[min(90vh,38rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
        <div className="shrink-0 border-b border-slate-100 px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
          <h2
            id="session-report-form-title"
            className="text-base font-semibold text-slate-900"
          >
            {t.sessionReports.wizard.title}
          </h2>
          <p className="mt-1 truncate text-sm text-slate-500">{caseTitle}</p>
          <div className="mt-3">
            <StepDots active={step} />
          </div>
          <p className="mt-2 text-center text-xs text-slate-500 sm:text-sm">
            {t.sessionReports.wizard.stepLabel.replace('{n}', String(step + 1))}{' '}
            · {STEPS[step]}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {step === 0 && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-800">
                {t.sessionReports.wizard.sessionNumber} *
                <input
                  type="number"
                  min={0}
                  value={values.sessionNumber}
                  disabled={loading}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    onChange({
                      sessionNumber:
                        Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
                    });
                  }}
                  className={inputClass}
                />
              </label>

              <label className="block text-sm font-medium text-slate-800">
                {t.sessionReports.meetingDate} *
                <input
                  type="date"
                  value={values.meetingDate}
                  disabled={loading}
                  max={todayDateInputValue()}
                  onChange={(e) => onChange({ meetingDate: e.target.value })}
                  className={inputClass}
                />
              </label>

              <label className="block text-sm font-medium text-slate-800">
                {t.sessionReports.meetingFrequency}
                {frequencyRequired ? ' *' : ''}
                {/* Rendered in both states so the field keeps the same height */}
                <span
                  aria-hidden={frequencyRequired || undefined}
                  className={`mt-0.5 block text-xs font-normal ${
                    frequencyRequired ? 'invisible' : 'text-slate-500'
                  }`}
                >
                  {frequencyRequired
                    ? '\u00A0'
                    : t.sessionReports.meetingFrequencyOptionalHint}
                </span>
                <select
                  value={values.meetingFrequencyWeeks}
                  disabled={loading}
                  onChange={(e) => {
                    const value = e.target.value;
                    onChange({
                      meetingFrequencyWeeks:
                        value === ''
                          ? ''
                          : (Number(value) as MeetingFrequencyWeeks),
                    });
                  }}
                  className={inputClass}
                >
                  <option value="">
                    {t.sessionReports.wizard.frequencyPlaceholder}
                  </option>
                  {MEETING_FREQUENCY_OPTIONS.map((weeks) => (
                    <option key={weeks} value={weeks}>
                      {meetingFrequencyLabel(weeks)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-800">
                {t.sessionReports.wizard.mainTheme} *
                <span className="mt-0.5 block text-xs font-normal text-slate-500">
                  {t.sessionReports.wizard.mainThemeHint}
                </span>
                <input
                  type="text"
                  maxLength={50}
                  value={values.mainTheme}
                  disabled={loading}
                  onChange={(e) => onChange({ mainTheme: e.target.value })}
                  placeholder={t.sessionReports.wizard.mainThemePlaceholder}
                  className={inputClass}
                />
                <span className="mt-1 block text-right text-xs text-slate-400">
                  {values.mainTheme.length}/50
                </span>
              </label>

              <label className="block text-sm font-medium text-slate-800">
                {t.sessionReports.wizard.personResponse} *
                <span className="mt-0.5 block text-xs font-normal text-slate-500">
                  {t.sessionReports.wizard.personResponseHint}
                </span>
                <textarea
                  rows={3}
                  value={values.personResponse}
                  disabled={loading}
                  onChange={(e) => onChange({ personResponse: e.target.value })}
                  placeholder={t.sessionReports.wizard.personResponsePlaceholder}
                  className={`${inputClass} resize-none`}
                />
              </label>

              <div>
                <p className="text-sm font-medium text-slate-800">
                  {t.sessionReports.wizard.previousTask} *
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {t.sessionReports.wizard.previousTaskHint}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <ChipOption
                    label={t.common.yes}
                    active={values.previousTaskCompleted === 'yes'}
                    disabled={loading}
                    onClick={() => onChange({ previousTaskCompleted: 'yes' })}
                  />
                  <ChipOption
                    label={t.sessionReports.wizard.partial}
                    active={values.previousTaskCompleted === 'partial'}
                    disabled={loading}
                    onClick={() =>
                      onChange({ previousTaskCompleted: 'partial' })
                    }
                  />
                  <ChipOption
                    label={t.common.no}
                    active={values.previousTaskCompleted === 'no'}
                    disabled={loading}
                    onClick={() => onChange({ previousTaskCompleted: 'no' })}
                  />
                </div>
                {(values.previousTaskCompleted === 'partial' ||
                  values.previousTaskCompleted === 'no') && (
                  <textarea
                    rows={2}
                    value={values.previousTaskNotCompletedReason}
                    disabled={loading}
                    onChange={(e) =>
                      onChange({
                        previousTaskNotCompletedReason: e.target.value,
                      })
                    }
                    placeholder={
                      t.sessionReports.wizard.previousTaskReasonPlaceholder
                    }
                    className={`${inputClass} resize-none`}
                  />
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-800">
                {t.sessionReports.wizard.progress} *
                <span className="mt-0.5 block text-xs font-normal text-slate-500">
                  {t.sessionReports.wizard.progressHint}
                </span>
                <textarea
                  rows={3}
                  value={values.progressNoted}
                  disabled={loading}
                  onChange={(e) => onChange({ progressNoted: e.target.value })}
                  placeholder={t.sessionReports.wizard.progressPlaceholder}
                  className={`${inputClass} resize-none`}
                />
              </label>

              <div>
                <p className="text-sm font-medium text-slate-800">
                  {t.sessionReports.wizard.commitments} *
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {t.sessionReports.wizard.commitmentsHint}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <ChipOption
                    label={t.common.yes}
                    active={values.nextCommitments === 'yes'}
                    disabled={loading}
                    onClick={() => onChange({ nextCommitments: 'yes' })}
                  />
                  <ChipOption
                    label={t.common.no}
                    active={values.nextCommitments === 'no'}
                    disabled={loading}
                    onClick={() => onChange({ nextCommitments: 'no' })}
                  />
                </div>
                {values.nextCommitments === 'yes' ? (
                  <textarea
                    rows={2}
                    value={values.nextCommitmentsDetails}
                    disabled={loading}
                    onChange={(e) =>
                      onChange({ nextCommitmentsDetails: e.target.value })
                    }
                    placeholder={
                      t.sessionReports.wizard.commitmentsDetailsPlaceholder
                    }
                    className={`${inputClass} resize-none`}
                  />
                ) : (
                  <textarea
                    rows={2}
                    value={values.noCommitmentsReason}
                    disabled={loading}
                    onChange={(e) =>
                      onChange({ noCommitmentsReason: e.target.value })
                    }
                    placeholder={
                      t.sessionReports.wizard.noCommitmentsReasonPlaceholder
                    }
                    className={`${inputClass} resize-none`}
                  />
                )}
              </div>
            </div>
          )}

          <p
            aria-live="polite"
            className="mt-3 min-h-[1.25rem] text-sm text-red-600"
          >
            {stepError}
          </p>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 sm:px-5">
          {step > 0 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={loading}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {t.common.back}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {t.common.cancel}
            </button>
          )}

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={loading || !canProceed}
              className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {t.sessionReports.wizard.forward}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !canProceed}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {loading && <CircularProgress size={14} color="inherit" />}
              {t.sessionReports.wizard.saveReport}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionReportFormDialog;
