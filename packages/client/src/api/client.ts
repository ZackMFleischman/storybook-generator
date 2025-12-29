import {
  Project,
  ProjectSummary,
  CreateProjectRequest,
  Outline,
  Manuscript,
  GenerateOutlineRequest,
  GenerateManuscriptRequest,
  GenerateAllPagesRequest,
  ExportPdfRequest,
  ExportResult,
  PageImage,
  RefineOutlineRequest,
  RefineManuscriptRequest,
  RefineIllustrationRequest,
  RefineAllIllustrationsRequest,
  IllustrationRefinementResult,
} from '@storybook-generator/shared';
import { fetchWithProgress } from './sse';

const API_BASE = '/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Request failed: ${response.status}`);
  }

  // Handle 204 No Content responses
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Project endpoints
export async function listProjects(): Promise<ProjectSummary[]> {
  return request<ProjectSummary[]>('/projects');
}

export async function createProject(data: CreateProjectRequest): Promise<Project> {
  return request<Project>('/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getProject(projectId: string): Promise<Project> {
  return request<Project>(`/projects/${projectId}`);
}

export async function updateProject(projectId: string, updates: Partial<Project>): Promise<Project> {
  return request<Project>(`/projects/${projectId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteProject(projectId: string): Promise<void> {
  await request<void>(`/projects/${projectId}`, {
    method: 'DELETE',
  });
}

// Generation endpoints
export async function generateOutline(data: GenerateOutlineRequest): Promise<Outline> {
  return request<Outline>('/generate/outline', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function generateManuscript(data: GenerateManuscriptRequest): Promise<Manuscript> {
  return request<Manuscript>('/generate/manuscript', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Refinement endpoints
export async function refineOutline(data: RefineOutlineRequest): Promise<Outline> {
  return request<Outline>('/generate/outline/refine', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function refineManuscript(data: RefineManuscriptRequest): Promise<Manuscript> {
  return request<Manuscript>('/generate/manuscript/refine', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function generateAllPages(data: GenerateAllPagesRequest): Promise<PageImage[]> {
  return request<PageImage[]>('/generate/all-pages', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function generateAllPagesWithProgress(
  data: GenerateAllPagesRequest,
  onProgress: (current: number, total: number, message: string) => void,
  onImageComplete?: (image: PageImage, imageType: 'cover' | 'page' | 'back-cover') => void
): Promise<PageImage[]> {
  return fetchWithProgress<PageImage[], PageImage>('/generate/all-pages', data, {
    onProgress,
    onImageComplete,
  });
}

export async function generatePage(
  projectId: string,
  pageNumber: number,
  additionalPrompt?: string
): Promise<PageImage> {
  return request<PageImage>(`/generate/page/${pageNumber}`, {
    method: 'POST',
    body: JSON.stringify({ projectId, additionalPrompt }),
  });
}

// Export endpoints
export async function exportPdf(data: ExportPdfRequest): Promise<ExportResult> {
  return request<ExportResult>(`/export/${data.projectId}/pdf`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getExportDownloadUrl(projectId: string, exportId: string): string {
  return `${API_BASE}/export/${projectId}/exports/${exportId}`;
}

export function getImageUrl(projectId: string, category: string, imageId: string, cacheBuster?: string): string {
  const baseUrl = `${API_BASE}/images/${projectId}/${category}/${imageId}`;
  return cacheBuster ? `${baseUrl}?v=${cacheBuster}` : baseUrl;
}

// Illustration refinement endpoints
export async function refineIllustration(data: RefineIllustrationRequest): Promise<PageImage> {
  return request<PageImage>('/generate/illustration/refine', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function refineAllIllustrations(data: RefineAllIllustrationsRequest): Promise<IllustrationRefinementResult> {
  return request<IllustrationRefinementResult>('/generate/illustrations/refine', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
