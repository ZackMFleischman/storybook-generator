/**
 * Simple logging utility for server-side operations
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_COLORS = {
  debug: '\x1b[36m', // cyan
  info: '\x1b[32m',  // green
  warn: '\x1b[33m',  // yellow
  error: '\x1b[31m', // red
  reset: '\x1b[0m',
};

const LOG_PREFIXES = {
  claude: '🧠 Claude',
  gemini: '🎨 Gemini',
  outline: '📋 Outline',
  manuscript: '📖 Manuscript',
  illustration: '🖼️  Illustration',
  storage: '💾 Storage',
  api: '🌐 API',
};

type LogCategory = keyof typeof LOG_PREFIXES;

function formatTime(): string {
  const now = new Date();
  return now.toISOString().slice(11, 23); // HH:MM:SS.mmm
}

function log(level: LogLevel, category: LogCategory, message: string, data?: unknown): void {
  const color = LOG_COLORS[level];
  const reset = LOG_COLORS.reset;
  const prefix = LOG_PREFIXES[category];
  const time = formatTime();

  const logMessage = `${color}[${time}] ${prefix}${reset} ${message}`;

  if (data !== undefined) {
    if (typeof data === 'object') {
      console.log(logMessage);
      console.log(`  ${color}→${reset}`, JSON.stringify(data, null, 2).split('\n').join('\n  '));
    } else {
      console.log(logMessage, `${color}→${reset}`, data);
    }
  } else {
    console.log(logMessage);
  }
}

export const logger = {
  // Claude adapter logging
  claude: {
    request: (prompt: string, options?: unknown) =>
      log('info', 'claude', `Sending request (${prompt.length} chars)`, options),
    cached: () =>
      log('debug', 'claude', 'Response found in cache'),
    response: (inputTokens: number, outputTokens: number) =>
      log('info', 'claude', `Response received (${inputTokens} in → ${outputTokens} out tokens)`),
    error: (error: string) =>
      log('error', 'claude', `Error: ${error}`),
  },

  // Gemini adapter logging
  gemini: {
    request: (description: string) =>
      log('info', 'gemini', `Generating image: ${description.slice(0, 80)}...`),
    withReferences: (count: number) =>
      log('debug', 'gemini', `Using ${count} reference image(s)`),
    response: (size: number) =>
      log('info', 'gemini', `Image generated (${Math.round(size / 1024)} KB)`),
    error: (error: string) =>
      log('error', 'gemini', `Error: ${error}`),
    session: {
      created: (id: string) => log('debug', 'gemini', `Session created: ${id}`),
      closed: (id: string) => log('debug', 'gemini', `Session closed: ${id}`),
    },
  },

  // Outline service logging
  outline: {
    generating: (topic: string, pages: number) =>
      log('info', 'outline', `Generating outline for "${topic}" (${pages} pages)`),
    generated: (title: string) =>
      log('info', 'outline', `Outline generated: "${title}"`),
    refining: () =>
      log('info', 'outline', 'Refining outline with feedback'),
    refined: () =>
      log('info', 'outline', 'Outline refined successfully'),
  },

  // Manuscript service logging
  manuscript: {
    generating: (pages: number) =>
      log('info', 'manuscript', `Generating manuscript (${pages} pages)`),
    generated: () =>
      log('info', 'manuscript', 'Manuscript generated successfully'),
    refining: () =>
      log('info', 'manuscript', 'Refining manuscript with feedback'),
    refined: () =>
      log('info', 'manuscript', 'Manuscript refined successfully'),
  },

  // Illustration service logging
  illustration: {
    startBatch: (total: number) =>
      log('info', 'illustration', `Starting batch generation (${total} images)`),
    generating: (type: string, pageNumber?: number) => {
      const desc = pageNumber !== undefined ? `${type} (page ${pageNumber})` : type;
      log('info', 'illustration', `Generating ${desc}`);
    },
    generated: (type: string, pageNumber?: number) => {
      const desc = pageNumber !== undefined ? `${type} (page ${pageNumber})` : type;
      log('info', 'illustration', `Generated ${desc}`);
    },
    progress: (current: number, total: number, message: string) =>
      log('debug', 'illustration', `Progress: ${current}/${total} - ${message}`),
    complete: (total: number) =>
      log('info', 'illustration', `Batch complete (${total} images generated)`),
    refining: (target: string) =>
      log('info', 'illustration', `Refining ${target}`),
    refined: (target: string) =>
      log('info', 'illustration', `Refined ${target}`),
  },

  // Storage logging
  storage: {
    saved: (type: string, id: string) =>
      log('debug', 'storage', `Saved ${type}: ${id}`),
    loaded: (type: string, id: string) =>
      log('debug', 'storage', `Loaded ${type}: ${id}`),
  },

  // API logging
  api: {
    request: (method: string, path: string) =>
      log('debug', 'api', `${method} ${path}`),
    sse: (event: string) =>
      log('debug', 'api', `SSE event: ${event}`),
  },
};
