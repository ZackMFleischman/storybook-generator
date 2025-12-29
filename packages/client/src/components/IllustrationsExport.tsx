import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import styled from '@emotion/styled';
import { useProjectStore, useGenerationStore, useUIStore, useEditStore } from '../stores/RootStore';
import { getImageUrl } from '../api/client';
import { PageCard } from './PageCard';
import { GenerationInfoModal } from './GenerationInfoModal';
import type { PageImage } from '@storybook-generator/shared';

const Container = styled.div`
  max-width: 1000px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
`;

const TitleSection = styled.div``;

const Title = styled.h2`
  color: var(--text-primary);
  margin: 0 0 0.25rem;
`;

const Subtitle = styled.p`
  color: var(--text-secondary);
  margin: 0;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'success' }>`
  padding: 0.75rem 1.25rem;
  background: ${props => {
    if (props.variant === 'secondary') return 'transparent';
    if (props.variant === 'success') return 'var(--success-color)';
    return 'var(--primary-color)';
  }};
  color: ${props => props.variant === 'secondary' ? 'var(--text-secondary)' : 'white'};
  border: ${props => props.variant === 'secondary' ? '1px solid var(--border-color)' : 'none'};
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const PageList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  margin-bottom: 2rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
`;

const EmptyTitle = styled.h3`
  color: var(--text-primary);
  margin: 0 0 0.5rem;
`;

const EmptyText = styled.p`
  color: var(--text-secondary);
  margin: 0 0 1.5rem;
`;

const SuccessMessage = styled.div`
  padding: 1rem;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: var(--radius-md);
  color: var(--success-color);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const ErrorMessage = styled.div`
  padding: 0.75rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: var(--radius-md);
  color: var(--error-color);
  margin-bottom: 1rem;
`;

const ExportSection = styled.div`
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ExportInfo = styled.div``;

const ExportTitle = styled.h3`
  color: var(--text-primary);
  margin: 0 0 0.25rem;
`;

const ExportDescription = styled.p`
  color: var(--text-secondary);
  margin: 0;
  font-size: 0.875rem;
`;

const CoverSection = styled.div`
  margin-bottom: 2rem;
`;

const CoverLabel = styled.h3`
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 1rem;
`;

const CoverCard = styled.div`
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  overflow: hidden;
`;

const CoverImage = styled.img`
  width: 100%;
  max-width: 400px;
  height: auto;
  display: block;
  margin: 0 auto;
`;

const CoverInfo = styled.div`
  padding: 1rem;
  border-top: 1px solid var(--border-color);
`;

const CoverTitle = styled.h4`
  color: var(--text-primary);
  margin: 0 0 0.25rem;
`;

const CoverText = styled.p`
  color: var(--text-secondary);
  margin: 0;
  font-size: 0.875rem;
`;

const CoverActions = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: 0.5rem 1rem;
  border-top: 1px solid var(--border-color);
`;

const InfoButton = styled.button`
  background: none;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;

  &:hover {
    background: var(--surface-color);
    color: var(--text-primary);
    border-color: var(--text-secondary);
  }
`;

const EditButton = styled.button`
  background: none;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;

  &:hover {
    background: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
  }
`;

const FloatingBar = styled.div`
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 0.75rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: var(--shadow-lg);
  z-index: 100;
`;

const FloatingBarText = styled.span`
  color: var(--text-primary);
  font-size: 0.875rem;
  font-weight: 500;
`;

const FloatingBarActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const FloatingButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;

  background: ${props => props.variant === 'primary' ? 'var(--primary-color)' : 'transparent'};
  color: ${props => props.variant === 'primary' ? 'white' : 'var(--text-secondary)'};
  border: 1px solid ${props => props.variant === 'primary' ? 'var(--primary-color)' : 'var(--border-color)'};

  &:hover:not(:disabled) {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const FeedbackBadge = styled.span`
  position: absolute;
  top: -0.5rem;
  right: -0.5rem;
  background: var(--secondary-color);
  color: white;
  font-size: 0.625rem;
  font-weight: 600;
  padding: 0.125rem 0.375rem;
  border-radius: 999px;
  z-index: 10;
`;

const CoverCardWrapper = styled.div<{ hasFeedback?: boolean }>`
  position: relative;
  border: 2px solid ${props => props.hasFeedback ? 'var(--secondary-color)' : 'transparent'};
  border-radius: var(--radius-lg);
`;

const FeedbackSection = styled.div`
  padding: 1rem;
  background: #fffbeb;
  border-top: 1px solid #fcd34d;
`;

const FeedbackLabel = styled.label`
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
`;

const FeedbackTextarea = styled.textarea`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-family: inherit;
  resize: vertical;
  min-height: 60px;

  &:focus {
    outline: none;
    border-color: var(--primary-color);
  }
`;

const FeedbackActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
  justify-content: flex-end;
`;

const SmallButton = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;

  background: ${props => {
    if (props.variant === 'primary') return 'var(--primary-color)';
    if (props.variant === 'danger') return 'var(--error-color)';
    return 'transparent';
  }};
  color: ${props => (props.variant === 'primary' || props.variant === 'danger') ? 'white' : 'var(--text-secondary)'};
  border: 1px solid ${props => {
    if (props.variant === 'primary') return 'var(--primary-color)';
    if (props.variant === 'danger') return 'var(--error-color)';
    return 'var(--border-color)';
  }};

  &:hover:not(:disabled) {
    opacity: 0.8;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const LoadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const LoadingCard = styled.div`
  background: var(--surface-color);
  border-radius: var(--radius-lg);
  padding: 2rem 3rem;
  text-align: center;
  box-shadow: var(--shadow-lg);
`;

const LoadingTitle = styled.h3`
  color: var(--text-primary);
  margin: 0 0 0.5rem;
`;

const LoadingText = styled.p`
  color: var(--text-secondary);
  margin: 0;
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

export const IllustrationsExport = observer(function IllustrationsExport() {
  const projectStore = useProjectStore();
  const generationStore = useGenerationStore();
  const uiStore = useUIStore();
  const editStore = useEditStore();

  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [selectedInfoImage, setSelectedInfoImage] = useState<PageImage | null>(null);
  const [editingCover, setEditingCover] = useState<'cover' | 'back-cover' | null>(null);
  const [localCoverFeedback, setLocalCoverFeedback] = useState('');
  const [localBackCoverFeedback, setLocalBackCoverFeedback] = useState('');
  // Cache-busting: track refresh timestamps for each image
  const [imageVersions, setImageVersions] = useState<Record<string, number>>({});

  const project = projectStore.currentProject;
  const pageImages = project?.pageImages || [];
  const manuscript = project?.manuscript;
  const outline = project?.outline;
  const coverImage = project?.coverImage;
  const backCoverImage = project?.backCoverImage;
  const isLoading = generationStore.isGenerating;
  const isRefining = editStore.isRefining;

  // Create a map of character IDs to names
  const characterNames = new Map<string, string>();
  outline?.characters.forEach((char) => {
    characterNames.set(char.id, char.name);
  });

  // Helper to get cache buster for an image
  const getImageCacheBuster = (imageKey: string): string => {
    return String(imageVersions[imageKey] || Date.now());
  };

  // Helper to refresh an image's cache buster
  const refreshImageVersion = (imageKey: string) => {
    setImageVersions(prev => ({ ...prev, [imageKey]: Date.now() }));
  };

  const handleGenerateIllustrations = async () => {
    await generationStore.generateIllustrations();
  };

  const handleExportPdf = async () => {
    const url = await generationStore.exportPdf();
    if (url) {
      setDownloadUrl(url);
      // Auto-download the PDF
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project?.name || 'storybook'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Cover feedback handlers
  const handleSaveCoverFeedback = () => {
    editStore.setCoverFeedback(localCoverFeedback);
    setEditingCover(null);
  };

  const handleSaveBackCoverFeedback = () => {
    editStore.setBackCoverFeedback(localBackCoverFeedback);
    setEditingCover(null);
  };

  const handleClearCoverFeedback = () => {
    setLocalCoverFeedback('');
    editStore.setCoverFeedback('');
    setEditingCover(null);
  };

  const handleClearBackCoverFeedback = () => {
    setLocalBackCoverFeedback('');
    editStore.setBackCoverFeedback('');
    setEditingCover(null);
  };

  const handleCancelCoverEdit = () => {
    setLocalCoverFeedback(editStore.illustrationFeedback.cover || '');
    setLocalBackCoverFeedback(editStore.illustrationFeedback.backCover || '');
    setEditingCover(null);
  };

  // Apply all feedback
  const handleApplyAllFeedback = async () => {
    const success = await editStore.applyAllIllustrationFeedback();
    if (success) {
      // Refresh all image versions
      const newVersions: Record<string, number> = {};
      const now = Date.now();
      if (editStore.illustrationFeedback.cover) {
        newVersions['cover'] = now;
      }
      if (editStore.illustrationFeedback.backCover) {
        newVersions['back-cover'] = now;
      }
      editStore.illustrationFeedback.pages.forEach((_, pageNumber) => {
        newVersions[`page-${pageNumber}`] = now;
      });
      setImageVersions(prev => ({ ...prev, ...newVersions }));
    }
  };

  // Apply single illustration feedback
  const handleRegeneratePage = async (pageNumber: number) => {
    const success = await editStore.applySingleIllustrationFeedback(pageNumber);
    if (success) {
      refreshImageVersion(`page-${pageNumber}`);
    }
  };

  const handleRegenerateCover = async () => {
    const success = await editStore.applySingleIllustrationFeedback('cover');
    if (success) {
      refreshImageVersion('cover');
    }
  };

  const handleRegenerateBackCover = async () => {
    const success = await editStore.applySingleIllustrationFeedback('back-cover');
    if (success) {
      refreshImageVersion('back-cover');
    }
  };

  if (pageImages.length === 0) {
    return (
      <Container>
        <Header>
          <TitleSection>
            <Title>Illustrations</Title>
            <Subtitle>Generate illustrations for your storybook</Subtitle>
          </TitleSection>
          <Button variant="secondary" onClick={() => uiStore.previousStep()}>
            Back
          </Button>
        </Header>

        {generationStore.error && (
          <ErrorMessage>{generationStore.error}</ErrorMessage>
        )}

        <EmptyState>
          <EmptyTitle>No Illustrations Yet</EmptyTitle>
          <EmptyText>
            Generate cover and illustrations for all {manuscript?.pages.length || 0} pages of your storybook.
          </EmptyText>
          <Button onClick={handleGenerateIllustrations} disabled={isLoading}>
            {isLoading ? 'Generating...' : 'Generate All Illustrations'}
          </Button>
        </EmptyState>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <TitleSection>
          <Title>Illustrations</Title>
          <Subtitle>
            {coverImage ? 'Cover + ' : ''}{pageImages.length} of {manuscript?.pages.length || 0} pages{backCoverImage ? ' + Back Cover' : ''} illustrated
          </Subtitle>
        </TitleSection>
        <ButtonGroup>
          <Button variant="secondary" onClick={() => uiStore.previousStep()}>
            Back
          </Button>
          <Button onClick={handleExportPdf} disabled={isLoading}>
            {isLoading ? 'Creating PDF...' : 'Export PDF'}
          </Button>
        </ButtonGroup>
      </Header>

      {generationStore.error && (
        <ErrorMessage>{generationStore.error}</ErrorMessage>
      )}

      {downloadUrl && (
        <SuccessMessage>
          <span>PDF downloaded!</span>
          <Button variant="success" onClick={() => window.open(downloadUrl, '_blank')}>
            Download Again
          </Button>
        </SuccessMessage>
      )}

      {/* Front Cover */}
      {coverImage && project && (
        <CoverSection>
          <CoverLabel>Front Cover</CoverLabel>
          <CoverCardWrapper hasFeedback={!!editStore.illustrationFeedback.cover}>
            {editStore.illustrationFeedback.cover && <FeedbackBadge>Feedback pending</FeedbackBadge>}
            <CoverCard>
              <CoverImage
                src={getImageUrl(project.id, 'cover', 'front', getImageCacheBuster('cover'))}
                alt="Front Cover"
              />
              <CoverInfo>
                <CoverTitle>{outline?.title}</CoverTitle>
                {outline?.subtitle && <CoverText>{outline.subtitle}</CoverText>}
              </CoverInfo>
              <CoverActions>
                <EditButton onClick={() => {
                  setLocalCoverFeedback(editStore.illustrationFeedback.cover || '');
                  setEditingCover(editingCover === 'cover' ? null : 'cover');
                }}>
                  {editingCover === 'cover' ? 'Close' : 'Edit'}
                </EditButton>
                {editStore.illustrationFeedback.cover && (
                  <SmallButton
                    variant="primary"
                    onClick={handleRegenerateCover}
                    disabled={isRefining}
                  >
                    {isRefining ? 'Regenerating...' : 'Regenerate'}
                  </SmallButton>
                )}
                <InfoButton onClick={() => setSelectedInfoImage(coverImage)}>
                  Info
                </InfoButton>
              </CoverActions>
              {editingCover === 'cover' && (
                <FeedbackSection>
                  <FeedbackLabel>Describe changes for the front cover</FeedbackLabel>
                  <FeedbackTextarea
                    value={localCoverFeedback}
                    onChange={(e) => setLocalCoverFeedback(e.target.value)}
                    placeholder="e.g., Make the title more prominent, add more sparkles, change the background color..."
                  />
                  <FeedbackActions>
                    {editStore.illustrationFeedback.cover && (
                      <SmallButton variant="danger" onClick={handleClearCoverFeedback}>
                        Clear
                      </SmallButton>
                    )}
                    <SmallButton onClick={handleCancelCoverEdit}>Cancel</SmallButton>
                    <SmallButton variant="primary" onClick={handleSaveCoverFeedback}>
                      Save Feedback
                    </SmallButton>
                  </FeedbackActions>
                </FeedbackSection>
              )}
            </CoverCard>
          </CoverCardWrapper>
        </CoverSection>
      )}

      <PageList>
        {pageImages
          .slice()
          .sort((a: PageImage, b: PageImage) => a.pageNumber - b.pageNumber)
          .map((pageImage: PageImage) => {
            const manuscriptPage = manuscript?.pages.find(p => p.pageNumber === pageImage.pageNumber);
            if (!manuscriptPage) return null;
            const pageFeedback = editStore.illustrationFeedback.pages.get(pageImage.pageNumber);
            return (
              <PageCard
                key={pageImage.pageNumber}
                page={manuscriptPage}
                pageImage={pageImage}
                imageUrl={project ? getImageUrl(project.id, 'pages', `page-${pageImage.pageNumber}`, getImageCacheBuster(`page-${pageImage.pageNumber}`)) : undefined}
                characterNames={characterNames}
                showImage={true}
                showIllustrationBrief={true}
                onInfoClick={() => setSelectedInfoImage(pageImage)}
                feedback={pageFeedback}
                onFeedbackChange={(feedback) => editStore.setPageIllustrationFeedback(pageImage.pageNumber, feedback)}
                onRegenerateClick={() => handleRegeneratePage(pageImage.pageNumber)}
                isRegenerating={isRefining}
              />
            );
          })}
      </PageList>

      {/* Back Cover */}
      {backCoverImage && project && (
        <CoverSection>
          <CoverLabel>Back Cover</CoverLabel>
          <CoverCardWrapper hasFeedback={!!editStore.illustrationFeedback.backCover}>
            {editStore.illustrationFeedback.backCover && <FeedbackBadge>Feedback pending</FeedbackBadge>}
            <CoverCard>
              <CoverImage
                src={getImageUrl(project.id, 'cover', 'back', getImageCacheBuster('back-cover'))}
                alt="Back Cover"
              />
              <CoverInfo>
                <CoverText>{outline?.backCoverBlurb}</CoverText>
              </CoverInfo>
              <CoverActions>
                <EditButton onClick={() => {
                  setLocalBackCoverFeedback(editStore.illustrationFeedback.backCover || '');
                  setEditingCover(editingCover === 'back-cover' ? null : 'back-cover');
                }}>
                  {editingCover === 'back-cover' ? 'Close' : 'Edit'}
                </EditButton>
                {editStore.illustrationFeedback.backCover && (
                  <SmallButton
                    variant="primary"
                    onClick={handleRegenerateBackCover}
                    disabled={isRefining}
                  >
                    {isRefining ? 'Regenerating...' : 'Regenerate'}
                  </SmallButton>
                )}
                <InfoButton onClick={() => setSelectedInfoImage(backCoverImage)}>
                  Info
                </InfoButton>
              </CoverActions>
              {editingCover === 'back-cover' && (
                <FeedbackSection>
                  <FeedbackLabel>Describe changes for the back cover</FeedbackLabel>
                  <FeedbackTextarea
                    value={localBackCoverFeedback}
                    onChange={(e) => setLocalBackCoverFeedback(e.target.value)}
                    placeholder="e.g., Change the background scene, update the blurb styling..."
                  />
                  <FeedbackActions>
                    {editStore.illustrationFeedback.backCover && (
                      <SmallButton variant="danger" onClick={handleClearBackCoverFeedback}>
                        Clear
                      </SmallButton>
                    )}
                    <SmallButton onClick={handleCancelCoverEdit}>Cancel</SmallButton>
                    <SmallButton variant="primary" onClick={handleSaveBackCoverFeedback}>
                      Save Feedback
                    </SmallButton>
                  </FeedbackActions>
                </FeedbackSection>
              )}
            </CoverCard>
          </CoverCardWrapper>
        </CoverSection>
      )}

      <ExportSection>
        <ExportInfo>
          <ExportTitle>Export Your Storybook</ExportTitle>
          <ExportDescription>
            Download your complete storybook as a print-ready PDF file.
          </ExportDescription>
        </ExportInfo>
        <Button onClick={handleExportPdf} disabled={isLoading}>
          {isLoading ? 'Creating PDF...' : 'Export as PDF'}
        </Button>
      </ExportSection>

      {/* Floating Action Bar for bulk feedback */}
      {editStore.hasIllustrationFeedback && (
        <FloatingBar>
          <FloatingBarText>
            {editStore.illustrationFeedbackCount} illustration{editStore.illustrationFeedbackCount !== 1 ? 's' : ''} with pending feedback
          </FloatingBarText>
          <FloatingBarActions>
            <FloatingButton onClick={() => editStore.clearIllustrationFeedback()}>
              Clear All
            </FloatingButton>
            <FloatingButton
              variant="primary"
              onClick={handleApplyAllFeedback}
              disabled={isRefining}
            >
              {isRefining ? 'Applying...' : 'Apply All Changes'}
            </FloatingButton>
          </FloatingBarActions>
        </FloatingBar>
      )}

      {/* Generation Info Modal */}
      {selectedInfoImage && (
        <GenerationInfoModal
          pageImage={selectedInfoImage}
          isOpen={true}
          onClose={() => setSelectedInfoImage(null)}
        />
      )}

      {/* Loading Overlay during refinement */}
      {isRefining && (
        <LoadingOverlay>
          <LoadingCard>
            <Spinner />
            <LoadingTitle>Regenerating Illustration</LoadingTitle>
            <LoadingText>This may take a moment...</LoadingText>
          </LoadingCard>
        </LoadingOverlay>
      )}
    </Container>
  );
});
