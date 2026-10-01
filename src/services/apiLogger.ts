import { ApiLogEntry } from '../types';

type Listener = (logs: ApiLogEntry[]) => void;

class ApiLogger {
  private logs: ApiLogEntry[] = [];
  private listeners: Set<Listener> = new Set();
  private maxLogs = 50;

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener([...this.logs]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public logStart(entry: Omit<ApiLogEntry, 'id' | 'timestamp' | 'status'>): string {
    const id = Math.random().toString(36).substring(2, 9);
    const newEntry: ApiLogEntry = {
      ...entry,
      id,
      timestamp: new Date(),
      status: 'PENDING',
    };

    this.logs = [newEntry, ...this.logs].slice(0, this.maxLogs);
    this.notify();
    return id;
  }

  public logComplete(id: string, status: number, durationMs: number, responseData?: any) {
    this.logs = this.logs.map((log) => {
      if (log.id === id) {
        return {
          ...log,
          status,
          durationMs,
          responseData,
        };
      }
      return log;
    });
    this.notify();
  }

  public logError(id: string, error: string, durationMs: number) {
    this.logs = this.logs.map((log) => {
      if (log.id === id) {
        return {
          ...log,
          status: 'ERROR',
          error,
          durationMs,
        };
      }
      return log;
    });
    this.notify();
  }

  public clear() {
    this.logs = [];
    this.notify();
  }

  public getLogs(): ApiLogEntry[] {
    return [...this.logs];
  }

  private notify() {
    const copy = [...this.logs];
    this.listeners.forEach((listener) => listener(copy));
  }
}

export const apiLogger = new ApiLogger();
