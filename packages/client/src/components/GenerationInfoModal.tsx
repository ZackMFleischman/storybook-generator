import { useState } from 'react';
import styled from '@emotion/styled';
import type { PageImage } from '@storybook-generator/shared';

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const Modal = styled.div`
  background: var(--background-color);
  border-radius: var(--radius-lg);
  max-width: 600px;
  width: 90%;
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
`;

const ModalTitle = styled.h3`
  margin: 0;
  color: var(--text-primary);
  font-size: 1.125rem;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 1.25rem;
  line-height: 1;

  &:hover {
    background: var(--surface-color);
    color: var(--text-primary);
  }
`;

const ModalBody = styled.div`
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
`;

const Section = styled.div`
  margin-bottom: 1.5rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h4`
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 0.75rem;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
`;

const InfoItem = styled.div`
  background: var(--surface-color);
  padding: 0.75rem;
  border-radius: var(--radius-md);
`;

const InfoLabel = styled.div`
  color: var(--text-secondary);
  font-size: 0.75rem;
  margin-bottom: 0.25rem;
`;

const InfoValue = styled.div`
  color: var(--text-primary);
  font-size: 0.875rem;
  font-family: monospace;
  word-break: break-all;
`;

const ReferenceList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const ReferenceTag = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--surface-color);
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
`;

const ReferenceType = styled.span`
  background: var(--primary-color);
  color: white;
  padding: 0.125rem 0.375rem;
  border-radius: var(--radius-sm);
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
`;

const ReferenceLabel = styled.span`
  color: var(--text-primary);
`;

const EmptyState = styled.div`
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-style: italic;
`;

const PromptContainer = styled.div`
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  max-height: 200px;
  overflow-y: auto;
`;

const PromptHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--border-color);
  background: var(--background-color);
  position: sticky;
  top: 0;
`;

const PromptLabel = styled.span`
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-weight: 500;
`;

const CopyButton = styled.button`
  background: none;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  cursor: pointer;

  &:hover {
    background: var(--surface-color);
    color: var(--text-primary);
  }
`;

const PromptText = styled.pre`
  margin: 0;
  padding: 0.75rem;
  color: var(--text-primary);
  font-size: 0.8125rem;
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5;
`;

interface GenerationInfoModalProps {
  pageImage: PageImage;
  isOpen: boolean;
  onClose: () => void;
}

export function GenerationInfoModal({ pageImage, isOpen, onClose }: GenerationInfoModalProps) {
  const [copied, setCopied] = useState(false);
  const metadata = pageImage.generationMetadata;

  if (!isOpen) return null;

  const handleCopyPrompt = async () => {
    const textToCopy = metadata?.prompt || pageImage.prompt;
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getPageLabel = () => {
    if (pageImage.imageType === 'cover') return 'Front Cover';
    if (pageImage.imageType === 'back-cover') return 'Back Cover';
    return `Page ${pageImage.pageNumber}`;
  };

  return (
    <Overlay onClick={handleOverlayClick}>
      <Modal>
        <ModalHeader>
          <ModalTitle>Generation Details - {getPageLabel()}</ModalTitle>
          <CloseButton onClick={onClose}>&times;</CloseButton>
        </ModalHeader>

        <ModalBody>
          {metadata ? (
            <>
              <Section>
                <SectionTitle>Session</SectionTitle>
                <InfoGrid>
                  <InfoItem>
                    <InfoLabel>Session ID</InfoLabel>
                    <InfoValue>{metadata.sessionId.split('-').slice(-2).join('-')}</InfoValue>
                  </InfoItem>
                  <InfoItem>
                    <InfoLabel>Message #</InfoLabel>
                    <InfoValue>{metadata.messageIndex || 'N/A'}</InfoValue>
                  </InfoItem>
                </InfoGrid>
              </Section>

              <Section>
                <SectionTitle>Model</SectionTitle>
                <InfoGrid>
                  <InfoItem>
                    <InfoLabel>Model</InfoLabel>
                    <InfoValue>{metadata.modelUsed}</InfoValue>
                  </InfoItem>
                  <InfoItem>
                    <InfoLabel>Aspect Ratio</InfoLabel>
                    <InfoValue>{metadata.aspectRatio}</InfoValue>
                  </InfoItem>
                  <InfoItem>
                    <InfoLabel>Generation Time</InfoLabel>
                    <InfoValue>{formatTime(metadata.generationTimeMs)}</InfoValue>
                  </InfoItem>
                  <InfoItem>
                    <InfoLabel>Generated At</InfoLabel>
                    <InfoValue>{new Date(metadata.generatedAt).toLocaleString()}</InfoValue>
                  </InfoItem>
                </InfoGrid>
              </Section>

              <Section>
                <SectionTitle>Reference Images</SectionTitle>
                {metadata.referenceImages.length === 0 ? (
                  <EmptyState>No reference images used (this image establishes the style)</EmptyState>
                ) : (
                  <ReferenceList>
                    {metadata.referenceImages.map((ref, i) => (
                      <ReferenceTag key={i}>
                        <ReferenceType>{ref.type}</ReferenceType>
                        <ReferenceLabel>{ref.label}</ReferenceLabel>
                      </ReferenceTag>
                    ))}
                  </ReferenceList>
                )}
              </Section>

              <Section>
                <SectionTitle>Prompt</SectionTitle>
                <PromptContainer>
                  <PromptHeader>
                    <PromptLabel>{metadata.prompt.length} characters</PromptLabel>
                    <CopyButton onClick={handleCopyPrompt}>
                      {copied ? 'Copied!' : 'Copy'}
                    </CopyButton>
                  </PromptHeader>
                  <PromptText>{metadata.prompt}</PromptText>
                </PromptContainer>
              </Section>
            </>
          ) : (
            <>
              <Section>
                <SectionTitle>Legacy Generation (Pre-Phase 2)</SectionTitle>
                <EmptyState>
                  This image was generated before session tracking was enabled.
                  Only basic information is available.
                </EmptyState>
              </Section>

              <Section>
                <SectionTitle>Basic Info</SectionTitle>
                <InfoGrid>
                  <InfoItem>
                    <InfoLabel>Model</InfoLabel>
                    <InfoValue>{pageImage.modelUsed}</InfoValue>
                  </InfoItem>
                  <InfoItem>
                    <InfoLabel>Aspect Ratio</InfoLabel>
                    <InfoValue>{pageImage.aspectRatio}</InfoValue>
                  </InfoItem>
                  <InfoItem>
                    <InfoLabel>Generated At</InfoLabel>
                    <InfoValue>{new Date(pageImage.generatedAt).toLocaleString()}</InfoValue>
                  </InfoItem>
                </InfoGrid>
              </Section>

              <Section>
                <SectionTitle>Prompt</SectionTitle>
                <PromptContainer>
                  <PromptHeader>
                    <PromptLabel>{pageImage.prompt.length} characters</PromptLabel>
                    <CopyButton onClick={handleCopyPrompt}>
                      {copied ? 'Copied!' : 'Copy'}
                    </CopyButton>
                  </PromptHeader>
                  <PromptText>{pageImage.prompt}</PromptText>
                </PromptContainer>
              </Section>
            </>
          )}
        </ModalBody>
      </Modal>
    </Overlay>
  );
}
