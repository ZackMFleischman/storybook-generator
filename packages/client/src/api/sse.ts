/**
 * Server-Sent Events (SSE) utilities for streaming progress updates
 */

const API_BASE = '/api';

export interface ProgressEvent<T = unknown, I = unknown> {
  type: 'progress' | 'imageComplete' | 'complete' | 'error';
  current?: number;
  total?: number;
  message?: string;
  image?: I;           // Completed image data (for imageComplete events)
  imageType?: 'cover' | 'page' | 'back-cover';  // Type of image completed
  data?: T;
  error?: string;
}

export interface ProgressCallbacks<T, I = unknown> {
  onProgress?: (current: number, total: number, message: string) => void;
  onImageComplete?: (image: I, imageType: 'cover' | 'page' | 'back-cover') => void;
  onComplete?: (data: T) => void;
  onError?: (error: string) => void;
}

/**
 * Make a POST request with SSE progress streaming
 *
 * @param endpoint - API endpoint (without /api prefix)
 * @param body - Request body to send as JSON
 * @param callbacks - Progress, complete, and error callbacks
 * @returns Promise resolving to the complete data
 */
export async function fetchWithProgress<T, I = unknown>(
  endpoint: string,
  body: unknown,
  callbacks: ProgressCallbacks<T, I>
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    const errorMessage = error.message || error.error || `Request failed: ${response.status}`;
    callbacks.onError?.(errorMessage);
    throw new Error(errorMessage);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let result: T | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const event = JSON.parse(line.slice(6)) as ProgressEvent<T>;

          if (event.type === 'progress') {
            if (event.current !== undefined && event.total !== undefined && event.message) {
              console.log(`[SSE] Progress: ${event.current}/${event.total} - ${event.message}`);
              callbacks.onProgress?.(event.current, event.total, event.message);
            }
          } else if (event.type === 'imageComplete') {
            if (event.image && event.imageType) {
              console.log(`[SSE] Image complete: ${event.imageType}`, event.image);
              callbacks.onImageComplete?.(event.image as I, event.imageType);
            }
          } else if (event.type === 'complete') {
            console.log('[SSE] Generation complete');
            result = event.data as T;
            callbacks.onComplete?.(result);
          } else if (event.type === 'error') {
            const errorMessage = event.error || 'Unknown error';
            console.error('[SSE] Error:', errorMessage);
            callbacks.onError?.(errorMessage);
            throw new Error(errorMessage);
          }
        } catch (e) {
          if (e instanceof SyntaxError) {
            console.error('Failed to parse SSE event:', line);
          } else {
            throw e;
          }
        }
      }
    }
  }

  if (result === undefined) {
    throw new Error('No result received from server');
  }

  return result;
}

/**
 * Create a progress tracker that can be used with MobX stores
 */
export interface ProgressTracker {
  isActive: boolean;
  current: number;
  total: number;
  message: string;
  percent: number;
}

export function createProgressTracker(): ProgressTracker {
  return {
    isActive: false,
    current: 0,
    total: 0,
    message: '',
    get percent() {
      return this.total > 0 ? (this.current / this.total) * 100 : 0;
    },
  };
}
