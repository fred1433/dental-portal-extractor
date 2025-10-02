/**
 * Logger utility with PHI masking for HIPAA compliance
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

class Logger {
  private level: LogLevel = LogLevel.INFO;
  
  setLevel(level: LogLevel) {
    this.level = level;
  }
  
  /**
   * Mask sensitive PHI data in strings
   */
  private maskPHI(message: string): string {
    // Mask SSN patterns (XXX-XX-XXXX)
    message = message.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '***-**-****');
    
    // Mask member IDs (9+ digits)
    message = message.replace(/\b\d{9,}\b/g, (match) => 
      match.substring(0, 3) + '*'.repeat(match.length - 3)
    );
    
    // Mask dates in MM/DD/YYYY format
    message = message.replace(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, 'XX/XX/XXXX');
    
    // Mask dates in YYYY-MM-DD format
    message = message.replace(/\b\d{4}-\d{2}-\d{2}\b/g, 'XXXX-XX-XX');
    
    return message;
  }
  
  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${this.maskPHI(message)}`;
  }
  
  debug(message: string, ...args: any[]) {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(this.formatMessage('DEBUG', message), ...args);
    }
  }
  
  info(message: string, ...args: any[]) {
    if (this.level <= LogLevel.INFO) {
      console.log(this.formatMessage('INFO', message), ...args);
    }
  }
  
  warn(message: string, ...args: any[]) {
    if (this.level <= LogLevel.WARN) {
      console.warn(this.formatMessage('WARN', message), ...args);
    }
  }
  
  error(message: string, error?: Error) {
    if (this.level <= LogLevel.ERROR) {
      console.error(this.formatMessage('ERROR', message));
      if (error) {
        console.error('Stack:', error.stack);
      }
    }
  }
  
  success(message: string) {
    console.log(`✅ ${this.formatMessage('SUCCESS', message)}`);
  }
  
  progress(message: string) {
    console.log(`🔄 ${this.formatMessage('PROGRESS', message)}`);
  }
}

export const logger = new Logger();