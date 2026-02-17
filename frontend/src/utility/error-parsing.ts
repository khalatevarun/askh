import { ErrorCategory, ErrorSource } from '../types/errors';
import type { AppError } from '../types/errors';

// eslint-disable-next-line no-control-regex
const ANSI_REGEX = /\x1b\[[0-9;]*[a-zA-Z]/g;

const COMPILATION_ERROR_PATTERNS = [
  /\[vite\].*error/i,
  /SyntaxError:/,
  /TypeError:/,
  /ReferenceError:/,
  /Cannot find module/,
  /Failed to resolve import/,
  /Unexpected token/,
  /Module not found/,
  /does not provide an export named/,
];

const VITE_SUCCESS_PATTERNS = [
  /hmr update/i,
  /page reload/i,
  /ready in \d+/i,
  /vite.*dev server running/i,
  /built in \d+/i,
];

export function stripAnsi(text: string): string {
  return text.replace(ANSI_REGEX, '');
}

export function extractSummary(text: string): string {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (/^\d+\s*\|/.test(line) || /^>\s*\d+\s*\|/.test(line) || /^\^/.test(line) || /^\|/.test(line)) continue;
    if (/^[\s^~]+$/.test(line)) continue;
    return line.slice(0, 200);
  }
  return lines[0]?.slice(0, 200) ?? text.slice(0, 200);
}

/** Re-export for backward compat */
export const extractErrorSummary = extractSummary;

export function normalizeForDedup(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 120);
}

function makeAppError(
  rawDetail: string,
  category: ErrorCategory,
  source: ErrorSource,
): AppError {
  const detail = stripAnsi(rawDetail).trim().slice(0, 500);
  const summary = extractSummary(detail);
  const id = normalizeForDedup(summary);
  return {
    id,
    summary,
    detail,
    category,
    source,
    timestamp: new Date().toISOString(),
  };
}

export function parseDevServerOutput(raw: string): AppError | null {
  const cleaned = stripAnsi(raw);
  for (const pattern of COMPILATION_ERROR_PATTERNS) {
    if (pattern.test(cleaned)) {
      return makeAppError(raw, ErrorCategory.Compilation, ErrorSource.DevServer);
    }
  }
  return null;
}

export function isCompilationSuccess(raw: string): boolean {
  const cleaned = stripAnsi(raw);
  return VITE_SUCCESS_PATTERNS.some((pattern) => pattern.test(cleaned));
}

export function parsePreviewMessage(message: { type: string; message?: string }): AppError | null {
  if (message.type !== 'PREVIEW_UNCAUGHT_EXCEPTION' && message.type !== 'PREVIEW_UNHANDLED_REJECTION') {
    return null;
  }
  const text = (message.message || '').slice(0, 500);
  if (!text) return null;
  return makeAppError(text, ErrorCategory.Runtime, ErrorSource.PreviewMessage);
}

export function parseInstallResult(exitCode: number, output: string): AppError | null {
  if (exitCode === 0) return null;

  const npmErrorLines = output
    .split('\n')
    .filter((line) => line.startsWith('npm ERR!') || line.startsWith('npm error'))
    .slice(0, 10)
    .join('\n');

  const detail = npmErrorLines || `npm install failed with exit code ${exitCode}`;
  return makeAppError(detail, ErrorCategory.Install, ErrorSource.NpmInstall);
}
