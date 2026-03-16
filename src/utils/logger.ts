type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost';

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLogLevel: LogLevel = isProduction ? 'error' : 'debug';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] <= LOG_LEVELS[currentLogLevel];
}

function formatMessage(level: LogLevel, context: string, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}`;
}

export const logger = {
  error: (context: string, message: string, error?: unknown) => {
    if (shouldLog('error')) {
      console.error(formatMessage('error', context, message), error || '');
    }
  },
  
  warn: (context: string, message: string) => {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', context, message));
    }
  },
  
  info: (context: string, message: string) => {
    if (shouldLog('info')) {
      console.info(formatMessage('info', context, message));
    }
  },
  
  debug: (context: string, message: string) => {
    if (shouldLog('debug')) {
      console.debug(formatMessage('debug', context, message));
    }
  },
};
