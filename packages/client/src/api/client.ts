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
} from '@storybook-generator/shared';

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
    method: 'PATCH',
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

export async function generateAllPages(data: GenerateAllPagesRequest): Promise<PageImage[]> {
  return request<PageImage[]>('/generate/pages', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function generatePage(
  projectId: string,
  pageNumber: number,
  additionalPrompt?: string
): Promise<PageImage> {
  return request<PageImage>('/generate/page', {
    method: 'POST',
    body: JSON.stringify({ projectId, pageNumber, additionalPrompt }),
  });
}

// Export endpoints
export async function exportPdf(data: ExportPdfRequest): Promise<ExportResult> {
  return request<ExportResult>('/export/pdf', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getExportDownloadUrl(exportId: string): string {
  return `${API_BASE}/export/${exportId}/download`;
}

export function getImageUrl(imagePath: string): string {
  return `${API_BASE}/images/${encodeURIComponent(imagePath)}`;
}
