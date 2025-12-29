import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import styled from '@emotion/styled';
import { useProjectStore, useGenerationStore, useUIStore } from '../stores/RootStore';
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

export const IllustrationsExport = observer(function IllustrationsExport() {
  const projectStore = useProjectStore();
  const generationStore = useGenerationStore();
  const uiStore = useUIStore();

  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [selectedInfoImage, setSelectedInfoImage] = useState<PageImage | null>(null);

  const project = projectStore.currentProject;
  const pageImages = project?.pageImages || [];
  const manuscript = project?.manuscript;
  const outline = project?.outline;
  const coverImage = project?.coverImage;
  const backCoverImage = project?.backCoverImage;
  const isLoading = generationStore.isGenerating;

  // Create a map of character IDs to names
  const characterNames = new Map<string, string>();
  outline?.characters.forEach((char) => {
    characterNames.set(char.id, char.name);
  });

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
          <CoverCard>
            <CoverImage
              src={getImageUrl(project.id, 'cover', 'front')}
              alt="Front Cover"
            />
            <CoverInfo>
              <CoverTitle>{outline?.title}</CoverTitle>
              {outline?.subtitle && <CoverText>{outline.subtitle}</CoverText>}
            </CoverInfo>
            <CoverActions>
              <InfoButton onClick={() => setSelectedInfoImage(coverImage)}>
                Info
              </InfoButton>
            </CoverActions>
          </CoverCard>
        </CoverSection>
      )}

      <PageList>
        {pageImages
          .slice()
          .sort((a: PageImage, b: PageImage) => a.pageNumber - b.pageNumber)
          .map((pageImage: PageImage) => {
            const manuscriptPage = manuscript?.pages.find(p => p.pageNumber === pageImage.pageNumber);
            if (!manuscriptPage) return null;
            return (
              <PageCard
                key={pageImage.pageNumber}
                page={manuscriptPage}
                pageImage={pageImage}
                imageUrl={project ? getImageUrl(project.id, 'pages', `page-${pageImage.pageNumber}`) : undefined}
                characterNames={characterNames}
                showImage={true}
                showIllustrationBrief={true}
                onInfoClick={() => setSelectedInfoImage(pageImage)}
              />
            );
          })}
      </PageList>

      {/* Back Cover */}
      {backCoverImage && project && (
        <CoverSection>
          <CoverLabel>Back Cover</CoverLabel>
          <CoverCard>
            <CoverImage
              src={getImageUrl(project.id, 'cover', 'back')}
              alt="Back Cover"
            />
            <CoverInfo>
              <CoverText>{outline?.backCoverBlurb}</CoverText>
            </CoverInfo>
            <CoverActions>
              <InfoButton onClick={() => setSelectedInfoImage(backCoverImage)}>
                Info
              </InfoButton>
            </CoverActions>
          </CoverCard>
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

      {/* Generation Info Modal */}
      {selectedInfoImage && (
        <GenerationInfoModal
          pageImage={selectedInfoImage}
          isOpen={true}
          onClose={() => setSelectedInfoImage(null)}
        />
      )}
    </Container>
  );
});
