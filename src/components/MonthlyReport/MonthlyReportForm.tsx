import React, { useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Radio,
  RadioGroup,
  TextField,
} from '@mui/material';
import { MonthlyReportAnswers, MonthlyReportMaritalStatus, User } from '../../types';
import { t } from '../../utils/translations';
import {
  emptyMonthlyReportAnswers,
  formatMonthKeyLabel,
  MONTHLY_REPORT_DUE_DAY_END,
  validateMonthlyReportAnswers,
} from './monthlyReportUtils';

interface MonthlyReportFormProps {
  monthKey: string;
  currentUser: User;
  submitting: boolean;
  onSubmit: (answers: MonthlyReportAnswers) => Promise<void>;
}

const MonthlyReportForm: React.FC<MonthlyReportFormProps> = ({
  monthKey,
  currentUser,
  submitting,
  onSubmit,
}) => {
  const [answers, setAnswers] = useState<MonthlyReportAnswers>(emptyMonthlyReportAnswers);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');

  const setField = <K extends keyof MonthlyReportAnswers>(
    key: K,
    value: MonthlyReportAnswers[K]
  ) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const canSubmit = Object.keys(validateMonthlyReportAnswers(answers)).length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !canSubmit) return;

    const validation = validateMonthlyReportAnswers(answers);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setSubmitError('');
    try {
      await onSubmit(answers);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t.monthlyReport.submitError);
    }
  };

  const textField = (
    key: keyof MonthlyReportAnswers,
    label: string,
    required = true,
    rows = 3
  ) => (
    <div className="space-y-1.5">
      <label htmlFor={`monthly-report-${key}`} className="block text-sm font-medium text-slate-800">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </label>
      <TextField
        id={`monthly-report-${key}`}
        fullWidth
        multiline
        minRows={rows}
        required={required}
        value={answers[key]}
        onChange={(e) => setField(key, e.target.value as MonthlyReportAnswers[typeof key])}
        error={!!errors[key]}
        helperText={errors[key] || ' '}
        disabled={submitting}
        inputProps={{ 'aria-label': label }}
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-10">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-600">{t.monthlyReport.intro}</p>
        <p className="mt-2 text-sm font-medium text-slate-800">
          {t.monthlyReport.reportFor.replace('{month}', formatMonthKeyLabel(monthKey))}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {t.monthlyReport.dueWindowHint.replace('{days}', String(MONTHLY_REPORT_DUE_DAY_END))}
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">{t.monthlyReport.yourInfo}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            fullWidth
            label={t.monthlyReport.name}
            value={currentUser.fullName}
            InputProps={{ readOnly: true }}
          />
          <TextField
            fullWidth
            label={t.monthlyReport.email}
            value={currentUser.email}
            InputProps={{ readOnly: true }}
          />
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">
          {t.monthlyReport.sectionSpiritual}
        </h2>
        {textField('relationshipWithGod', t.monthlyReport.relationshipWithGod)}
        {textField('mostAliveDiscipline', t.monthlyReport.mostAliveDiscipline)}
        {textField('disciplineNeedsStrengthening', t.monthlyReport.disciplineNeedsStrengthening)}
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">
          {t.monthlyReport.sectionRelationships}
        </h2>
        <FormControl error={!!errors.maritalStatus} disabled={submitting}>
          <FormLabel>{t.monthlyReport.maritalStatus}</FormLabel>
          <RadioGroup
            row
            value={answers.maritalStatus}
            onChange={(e) =>
              setField('maritalStatus', e.target.value as MonthlyReportMaritalStatus)
            }
          >
            <FormControlLabel
              value="casatorit"
              control={<Radio />}
              label={t.monthlyReport.married}
            />
            <FormControlLabel
              value="necasatorit"
              control={<Radio />}
              label={t.monthlyReport.unmarried}
            />
          </RadioGroup>
          {errors.maritalStatus && <FormHelperText>{errors.maritalStatus}</FormHelperText>}
        </FormControl>

        {answers.maritalStatus === 'casatorit'
          ? textField('marriageFamilyNotes', t.monthlyReport.marriageFamilyNotes)
          : textField('closeRelationshipsNotes', t.monthlyReport.closeRelationshipsNotes)}

        {textField(
          'needsPersonalRelationshipSupport',
          t.monthlyReport.needsPersonalRelationshipSupport
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">
          {t.monthlyReport.sectionSelfCare}
        </h2>
        {textField('heartState', t.monthlyReport.heartState)}
        {textField('feelsTiredOrBurdened', t.monthlyReport.feelsTiredOrBurdened)}
        {textField('howLeaderOrTeamCanHelp', t.monthlyReport.howLeaderOrTeamCanHelp)}
        {textField('departmentImprovements', t.monthlyReport.departmentImprovements, false)}
      </section>

      {submitError && (
        <Alert severity="error" className="rounded-xl">
          {submitError}
        </Alert>
      )}

      <div className="flex justify-end">
        <Button
          type="submit"
          variant="contained"
          disabled={submitting || !canSubmit}
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
          className="rounded-full"
        >
          {t.monthlyReport.submit}
        </Button>
      </div>
    </form>
  );
};

export default MonthlyReportForm;
