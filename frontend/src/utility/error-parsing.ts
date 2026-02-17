export function stripAnsi(text: string): string {
  const ansiPattern = new RegExp(String.fromCharCode(27) + '\\[[0-9;]*[A-Za-z]', 'g');
  return text.replace(ansiPattern, '');
}

export interface ParsedError {
  summary: string;
  detail: string;
  filePath?: string;
}

export function parseViteError(output: string): ParsedError | null {
  const cleaned = stripAnsi(output);

  const patterns = [
    /\[vite\]\s*Internal server error:/i,
    /SyntaxError:/i,
    /TypeError:/i,
    /ReferenceError:/i,
    /Cannot find module/i,
    /Failed to resolve import/i,
    /Unexpected token/i,
    /Module not found/i,
    /does not provide an export named/i,
    /Error:/i,
  ];

  const hasError = patterns.some((p) => p.test(cleaned));
  if (!hasError) return null;

  const lines = cleaned.split('\n');

  const codeFramePattern = /^\d+\s*\|/;
  const arrowPattern = /^>\s*\d+\s*\|/;
  const caretPattern = /^\^/;
  const pipePattern = /^\|/;
  const whitespacePattern = /^[\s^~]+$/;

  const meaningfulLines: string[] = [];
  for (const line of lines) {
    if (
      codeFramePattern.test(line) ||
      arrowPattern.test(line) ||
      caretPattern.test(line) ||
      pipePattern.test(line) ||
      whitespacePattern.test(line)
    ) {
      continue;
    }
    if (line.trim()) {
      meaningfulLines.push(line.trim());
    }
  }

  const summary = meaningfulLines[0] || 'Vite compilation error';

  let filePath: string | undefined;
  const fileMatch = cleaned.match(/File:\s*(.+)/i);
  if (fileMatch) {
    filePath = fileMatch[1].trim();
  }

  const detail = cleaned.slice(0, 500);

  return { summary, detail, filePath };
}

export function parseNpmError(
  exitCode: number,
  output: string
): ParsedError | null {
  if (exitCode === 0) return null;

  const cleaned = stripAnsi(output);
  const lines = cleaned.split('\n');

  const errorLines = lines.filter(
    (line) => line.startsWith('npm ERR!') || line.toLowerCase().startsWith('npm error')
  );

  if (errorLines.length > 0) {
    const summary = errorLines[0].replace(/^npm ERR!\s*/, '').replace(/^npm error\s*/i, '').trim();
    const detail = errorLines.slice(0, 10).join('\n');
    return { summary, detail };
  }

  const summary = `npm install failed with exit code ${exitCode}`;
  const detail = `The npm install command exited with code ${exitCode}.`;
  return { summary, detail };
}

export function parseRuntimeError(message: string, stack?: string): ParsedError {
  const summary = message.split('\n')[0].slice(0, 200);
  let detail = message;
  if (stack) {
    detail = message + '\n' + stack;
  }
  detail = detail.slice(0, 500);
  return { summary, detail };
}

export function isViteSuccess(output: string): boolean {
  const cleaned = stripAnsi(output);
  const patterns = [
    /ready in \d+ms/i,
    /VITE/v,
    /dev server running/i,
    /built in \d+ms/i,
  ];
  return patterns.some((p) => p.test(cleaned));
}

export function makeDedupKey(source: string, summary: string): string {
  const normalized = summary
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
  return `${source}::${normalized}`;
}
