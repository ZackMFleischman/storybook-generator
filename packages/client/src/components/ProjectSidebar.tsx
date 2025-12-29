import { observer } from 'mobx-react-lite';
import styled from '@emotion/styled';
import { useProjectStore, useUIStore } from '../stores/RootStore';
import type { ProjectSummary } from '@storybook-generator/shared';
import { getImageUrl } from '../api/client';

const Overlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  opacity: ${props => props.isOpen ? 1 : 0};
  visibility: ${props => props.isOpen ? 'visible' : 'hidden'};
  transition: opacity 0.2s ease, visibility 0.2s ease;
  z-index: 100;
`;

const Drawer = styled.aside<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 400px;
  background: var(--surface-color);
  box-shadow: var(--shadow-lg);
  transform: translateX(${props => props.isOpen ? '0' : '-100%'});
  transition: transform 0.2s ease;
  z-index: 101;
  display: flex;
  flex-direction: column;
`;

const DrawerHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const DrawerTitle = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  color: var(--text-primary);
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0.25rem;
  line-height: 1;

  &:hover {
    color: var(--text-primary);
  }
`;

const NewProjectButton = styled.button`
  margin: 1rem 1.5rem;
  padding: 0.75rem 1rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:hover {
    background: var(--primary-hover);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ProjectList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 0;
`;

const ProjectItem = styled.div<{ isActive: boolean }>`
  padding: 1rem;
  cursor: pointer;
  border-left: 3px solid ${props => props.isActive ? 'var(--primary-color)' : 'transparent'};
  background: ${props => props.isActive ? 'var(--background-color)' : 'transparent'};
  display: flex;
  flex-direction: column;
  gap: 0.75rem;

  &:hover {
    background: var(--background-color);
  }

  &:hover .delete-btn {
    opacity: 1;
  }
`;

const ProjectThumbnail = styled.div`
  width: 100%;
  aspect-ratio: 4 / 3;
  flex-shrink: 0;
  background: var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ThumbnailImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: var(--surface-color);
`;

const ThumbnailPlaceholder = styled.div`
  font-size: 2.5rem;
  color: var(--text-secondary);
  opacity: 0.5;
`;

const ProjectInfo = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ProjectName = styled.div`
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1.3;
`;

const ProjectFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ProjectMeta = styled.div`
  font-size: 0.8rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const StageBadge = styled.span<{ stage: string }>`
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.7rem;
  font-weight: 500;
  text-transform: uppercase;
  background: ${props => {
    switch (props.stage) {
      case 'outline': return 'var(--info-color)';
      case 'manuscript': return 'var(--warning-color)';
      case 'illustrations': return 'var(--success-color)';
      case 'export': return 'var(--primary-color)';
      default: return 'var(--border-color)';
    }
  }};
  color: white;
`;

const DeleteButton = styled.button`
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.25rem;
  font-size: 0.75rem;
  opacity: 0;
  transition: opacity 0.15s;

  &:hover {
    color: var(--error-color);
  }
`;

const EmptyState = styled.div`
  padding: 2rem 1.5rem;
  text-align: center;
  color: var(--text-secondary);
`;

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getThumbnailUrl(project: ProjectSummary): string | null {
  if (project.hasCoverImage) {
    return getImageUrl(project.id, 'cover', 'front');
  }
  if (project.hasPageImages && project.firstPageNumber !== undefined) {
    return getImageUrl(project.id, 'pages', String(project.firstPageNumber));
  }
  return null;
}

export const ProjectSidebar = observer(function ProjectSidebar() {
  const projectStore = useProjectStore();
  const uiStore = useUIStore();

  const handleNewProject = async () => {
    const name = `Storybook ${new Date().toLocaleDateString()}`;
    await projectStore.createProject(name);
    uiStore.resetWizard();
    uiStore.toggleSidebar();
  };

  const handleSelectProject = async (project: ProjectSummary) => {
    await projectStore.loadProject(project.id);
    uiStore.navigateToProjectState();
    uiStore.toggleSidebar();
  };

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (confirm('Delete this project?')) {
      await projectStore.deleteProject(projectId);
    }
  };

  return (
    <>
      <Overlay isOpen={uiStore.isSidebarOpen} onClick={() => uiStore.toggleSidebar()} />
      <Drawer isOpen={uiStore.isSidebarOpen}>
        <DrawerHeader>
          <DrawerTitle>Projects</DrawerTitle>
          <CloseButton onClick={() => uiStore.toggleSidebar()}>x</CloseButton>
        </DrawerHeader>

        <NewProjectButton onClick={handleNewProject} disabled={projectStore.isLoading}>
          + New Project
        </NewProjectButton>

        <ProjectList>
          {projectStore.projectList.length === 0 ? (
            <EmptyState>
              No projects yet.<br />
              Create your first storybook!
            </EmptyState>
          ) : (
            projectStore.projectList.map(project => {
              const thumbnailUrl = getThumbnailUrl(project);
              return (
                <ProjectItem
                  key={project.id}
                  isActive={projectStore.currentProject?.id === project.id}
                  onClick={() => handleSelectProject(project)}
                >
                  <ProjectThumbnail>
                    {thumbnailUrl ? (
                      <ThumbnailImage src={thumbnailUrl} alt="" />
                    ) : (
                      <ThumbnailPlaceholder>&#128214;</ThumbnailPlaceholder>
                    )}
                  </ProjectThumbnail>
                  <ProjectInfo>
                    <ProjectName>{project.title || project.name}</ProjectName>
                    <ProjectFooter>
                      <ProjectMeta>
                        <span>{formatDate(project.updatedAt)}</span>
                        <StageBadge stage={project.currentStage}>
                          {project.currentStage}
                        </StageBadge>
                      </ProjectMeta>
                      <DeleteButton className="delete-btn" onClick={(e) => handleDeleteProject(e, project.id)}>
                        Delete
                      </DeleteButton>
                    </ProjectFooter>
                  </ProjectInfo>
                </ProjectItem>
              );
            })
          )}
        </ProjectList>
      </Drawer>
    </>
  );
});
