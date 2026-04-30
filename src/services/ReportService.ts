import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { ActivityAttempt, GameProgress } from '../core/types';
import { JournalEntry } from '../core/journal';
import { AchievementStatus } from '../core/achievements';
import { getDailyStreak } from '../core/progress';

export interface ReportPayload {
  childName: string;
  childAgeMonths?: number;
  parentEmail?: string;
  attempts: ActivityAttempt[];
  gameProgress: Record<string, GameProgress>;
  journalEntries: JournalEntry[];
  achievements: AchievementStatus[];
}

export interface ReportEmailTemplate {
  subject: string;
  body: string;
}

export interface ReportExportResult {
  uri: string;
  emailTemplate: ReportEmailTemplate;
}

interface ReportSummary {
  totalAttempts: number;
  totalSuccesses: number;
  successRate: number;
  streak: number;
  modulesTried: number;
  unlockedAchievements: AchievementStatus[];
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatAge(months?: number): string {
  if (!months || months <= 0) return 'Not set';
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest} months`;
  if (rest === 0) return `${years} years`;
  return `${years} years ${rest} months`;
}

function buildSummary(payload: ReportPayload): ReportSummary {
  const totalAttempts = payload.attempts.length;
  const totalSuccesses = payload.attempts.filter(item => item.result === 'success').length;
  const successRate = totalAttempts > 0 ? Math.round((totalSuccesses / totalAttempts) * 100) : 0;
  const streak = getDailyStreak(payload.attempts);
  const modulesTried = Object.keys(payload.gameProgress).length;
  const unlockedAchievements = payload.achievements.filter(item => item.unlocked);
  return {
    totalAttempts,
    totalSuccesses,
    successRate,
    streak,
    modulesTried,
    unlockedAchievements,
  };
}

export function buildReportEmailTemplate(payload: ReportPayload): ReportEmailTemplate {
  const summary = buildSummary(payload);
  const dateLabel = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const childName = payload.childName || 'Child';
  const unlockedList = summary.unlockedAchievements.slice(0, 4).map(item => item.title).join(', ');

  const subject = `NeuroMoves report for ${childName} - ${dateLabel}`;
  const bodyLines = [
    'Hello OT/SLP team,',
    '',
    `I am sharing ${childName}'s latest NeuroMoves progress summary.`,
    '',
    'Quick snapshot:',
    `- Total attempts: ${summary.totalAttempts}`,
    `- Successful attempts: ${summary.totalSuccesses}`,
    `- Success rate: ${summary.successRate}%`,
    `- Current streak: ${summary.streak} day(s)`,
    `- Modules tried: ${summary.modulesTried}`,
    `- Achievements unlocked: ${summary.unlockedAchievements.length}`,
    unlockedList ? `- Recent achievements: ${unlockedList}` : '- Recent achievements: none yet',
    '',
    'Please review the attached PDF report for full details.',
    '',
    'Thank you,',
    payload.parentEmail || 'Parent/Caregiver'
  ];

  return {
    subject,
    body: bodyLines.join('\n')
  };
}

function buildReportHtml(payload: ReportPayload): string {
  const summary = buildSummary(payload);
  const recentJournal = payload.journalEntries.slice(0, 5);

  const dateLabel = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <style>
      body { font-family: Arial, sans-serif; color: #1f2937; padding: 24px; }
      h1 { font-size: 24px; margin-bottom: 6px; }
      h2 { font-size: 16px; margin: 18px 0 8px 0; color: #ea580c; }
      .muted { color: #6b7280; font-size: 12px; }
      .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; margin-bottom: 10px; }
      .row { display: flex; gap: 8px; }
      .metric { flex: 1; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; }
      .metric-value { font-size: 20px; font-weight: bold; color: #111827; }
      .metric-label { font-size: 12px; color: #6b7280; }
      ul { margin: 0; padding-left: 18px; }
      li { margin-bottom: 6px; font-size: 13px; }
      .footer { margin-top: 24px; font-size: 11px; color: #6b7280; }
    </style>
  </head>
  <body>
    <h1>NeuroMoves Progress Report</h1>
    <div class="muted">Generated on ${escapeHtml(dateLabel)}</div>

    <div class="card">
      <strong>Child:</strong> ${escapeHtml(payload.childName)}<br/>
      <strong>Age:</strong> ${escapeHtml(formatAge(payload.childAgeMonths))}<br/>
      <strong>Parent Account:</strong> ${escapeHtml(payload.parentEmail || 'Not provided')}
    </div>

    <h2>Practice Snapshot</h2>
    <div class="row">
      <div class="metric">
        <div class="metric-value">${summary.totalAttempts}</div>
        <div class="metric-label">Total Attempts</div>
      </div>
      <div class="metric">
        <div class="metric-value">${summary.totalSuccesses}</div>
        <div class="metric-label">Successful Attempts</div>
      </div>
      <div class="metric">
        <div class="metric-value">${summary.successRate}%</div>
        <div class="metric-label">Success Rate</div>
      </div>
    </div>
    <div class="row">
      <div class="metric">
        <div class="metric-value">${summary.streak}</div>
        <div class="metric-label">Current Day Streak</div>
      </div>
      <div class="metric">
        <div class="metric-value">${summary.modulesTried}</div>
        <div class="metric-label">Modules Tried</div>
      </div>
      <div class="metric">
        <div class="metric-value">${summary.unlockedAchievements.length}</div>
        <div class="metric-label">Achievements Unlocked</div>
      </div>
    </div>

    <h2>Achievements</h2>
    <div class="card">
      ${summary.unlockedAchievements.length === 0
      ? '<div class="muted">No achievements unlocked yet.</div>'
      : `<ul>${summary.unlockedAchievements
        .map(item => `<li>${escapeHtml(item.sticker)} <strong>${escapeHtml(item.title)}</strong> - ${escapeHtml(item.description)}</li>`)
        .join('')}</ul>`}
    </div>

    <h2>Recent Real-Life Journal Notes</h2>
    <div class="card">
      ${recentJournal.length === 0
      ? '<div class="muted">No journal entries yet.</div>'
      : `<ul>${recentJournal
        .map(entry => `<li><strong>${escapeHtml(new Date(entry.createdAt).toLocaleDateString())}</strong>: ${escapeHtml(entry.text)}${entry.photoUri ? ' (photo attached in app)' : ''}</li>`)
        .join('')}</ul>`}
    </div>

    <div class="footer">
      This report is intended to support parent-professional collaboration and does not replace clinical assessment.
    </div>
  </body>
</html>
  `.trim();
}

export async function exportProgressReport(payload: ReportPayload): Promise<ReportExportResult> {
  const html = buildReportHtml(payload);
  const file = await Print.printToFileAsync({
    html,
    base64: false
  });

  return { uri: file.uri, emailTemplate: buildReportEmailTemplate(payload) };
}

export async function shareProgressReportPdf(uri: string): Promise<boolean> {
  const available = await Sharing.isAvailableAsync();
  if (!available) return false;

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Share Progress Report PDF',
    UTI: '.pdf'
  });
  return true;
}
