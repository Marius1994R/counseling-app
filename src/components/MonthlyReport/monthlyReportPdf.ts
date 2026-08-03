import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { MonthlyReport, MonthlyReportAnswers } from '../../types';
import { t } from '../../utils/translations';
import { formatMonthKeyLabel } from './monthlyReportUtils';

export function getMonthlyReportAnswerRows(
  answers: MonthlyReportAnswers
): Array<{ label: string; value: string }> {
  const items: Array<{ label: string; value: string }> = [
    { label: t.monthlyReport.relationshipWithGod, value: answers.relationshipWithGod },
    { label: t.monthlyReport.mostAliveDiscipline, value: answers.mostAliveDiscipline },
    {
      label: t.monthlyReport.disciplineNeedsStrengthening,
      value: answers.disciplineNeedsStrengthening,
    },
    {
      label: t.monthlyReport.maritalStatus,
      value:
        answers.maritalStatus === 'casatorit'
          ? t.monthlyReport.married
          : t.monthlyReport.unmarried,
    },
  ];

  if (answers.maritalStatus === 'casatorit') {
    items.push({
      label: t.monthlyReport.marriageFamilyNotes,
      value: answers.marriageFamilyNotes,
    });
  } else {
    items.push({
      label: t.monthlyReport.closeRelationshipsNotes,
      value: answers.closeRelationshipsNotes,
    });
  }

  items.push(
    {
      label: t.monthlyReport.needsPersonalRelationshipSupport,
      value: answers.needsPersonalRelationshipSupport,
    },
    { label: t.monthlyReport.heartState, value: answers.heartState },
    { label: t.monthlyReport.feelsTiredOrBurdened, value: answers.feelsTiredOrBurdened },
    {
      label: t.monthlyReport.howLeaderOrTeamCanHelp,
      value: answers.howLeaderOrTeamCanHelp,
    },
    {
      label: t.monthlyReport.departmentImprovements,
      value: answers.departmentImprovements,
    }
  );

  return items;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildReportHtml(report: MonthlyReport): string {
  const monthLabel = formatMonthKeyLabel(report.monthKey);
  const submittedLabel = report.submittedAt.toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const rows = getMonthlyReportAnswerRows(report.answers);
  const spiritual = rows.slice(0, 3).filter((row) => row.value?.trim());
  const relationships = rows.slice(3, 6).filter((row) => row.value?.trim());
  const selfCare = rows.slice(6).filter((row) => row.value?.trim());

  const renderSection = (title: string, sectionRows: Array<{ label: string; value: string }>) => `
    <section style="margin-top: 20px;">
      <h2 style="font-size: 14px; margin: 0 0 10px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
        ${escapeHtml(title)}
      </h2>
      ${sectionRows
        .map(
          (row) => `
        <div style="margin-bottom: 12px;">
          <div style="font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 4px;">
            ${escapeHtml(row.label)}
          </div>
          <div style="font-size: 12px; color: #0f172a; white-space: pre-wrap; line-height: 1.45;">
            ${escapeHtml(row.value)}
          </div>
        </div>`
        )
        .join('')}
    </section>`;

  return `
    <div style="width: 740px; padding: 24px; font-family: Arial, Helvetica, sans-serif; background: #fff; color: #0f172a;">
      <h1 style="font-size: 20px; margin: 0 0 4px;">${escapeHtml(t.monthlyReport.title)}</h1>
      <p style="margin: 0 0 16px; font-size: 12px; color: #64748b;">
        ${escapeHtml(t.monthlyReport.subtitle)} · ${escapeHtml(
          t.monthlyReport.reportFor.replace('{month}', monthLabel)
        )}
      </p>
      <div style="font-size: 12px; margin-bottom: 8px;">
        <strong>${escapeHtml(t.monthlyReport.name)}:</strong> ${escapeHtml(report.userName)}
      </div>
      <div style="font-size: 12px; margin-bottom: 8px;">
        <strong>${escapeHtml(t.monthlyReport.email)}:</strong> ${escapeHtml(report.userEmail)}
      </div>
      <div style="font-size: 12px; margin-bottom: 4px; color: #64748b;">
        ${escapeHtml(t.monthlyReport.submittedAt.replace('{date}', submittedLabel))}
      </div>
      ${renderSection(t.monthlyReport.sectionSpiritual, spiritual)}
      ${renderSection(t.monthlyReport.sectionRelationships, relationships)}
      ${renderSection(t.monthlyReport.sectionSelfCare, selfCare)}
    </div>
  `;
}

function sanitizeFilenamePart(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 60);
}

export async function downloadMonthlyReportPdf(report: MonthlyReport): Promise<void> {
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '0';
  host.style.width = '788px';
  host.style.background = '#ffffff';
  host.innerHTML = buildReportHtml(report);
  document.body.appendChild(host);

  try {
    const canvas = await html2canvas(host.firstElementChild as HTMLElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = (canvas.height * contentWidth) / canvas.width;

    let heightLeft = contentHeight;
    let position = margin;

    pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight);
    heightLeft -= pageHeight - margin * 2;

    while (heightLeft > 0) {
      position = margin - (contentHeight - heightLeft);
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight);
      heightLeft -= pageHeight - margin * 2;
    }

    const filename = `raport-lunar_${sanitizeFilenamePart(report.userName)}_${report.monthKey}.pdf`;
    pdf.save(filename);
  } finally {
    document.body.removeChild(host);
  }
}
