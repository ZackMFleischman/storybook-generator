import { useState } from 'react';
import styled from '@emotion/styled';

const Container = styled.div<{ hasFeedback: boolean }>`
  position: relative;
  border: 2px solid ${props => props.hasFeedback ? 'var(--secondary-color)' : 'transparent'};
  border-radius: var(--radius-md);
  transition: border-color 0.2s ease;

  &:hover .edit-button {
    opacity: 1;
  }
`;

const EditButton = styled.button`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  padding: 0.25rem 0.5rem;
  background: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  color: var(--text-secondary);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 10;

  &:hover {
    background: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
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
`;

const FeedbackInputContainer = styled.div`
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: var(--radius-md);
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

const SmallButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;

  background: ${props => props.variant === 'primary' ? 'var(--primary-color)' : 'transparent'};
  color: ${props => props.variant === 'primary' ? 'white' : 'var(--text-secondary)'};
  border: 1px solid ${props => props.variant === 'primary' ? 'var(--primary-color)' : 'var(--border-color)'};

  &:hover {
    opacity: 0.8;
  }
`;

interface EditableSectionProps {
  children: React.ReactNode;
  sectionLabel: string;
  feedback?: string;
  onFeedbackChange: (feedback: string) => void;
}

export function EditableSection({
  children,
  sectionLabel,
  feedback,
  onFeedbackChange,
}: EditableSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localFeedback, setLocalFeedback] = useState(feedback || '');

  const hasFeedback = !!feedback;

  const handleSave = () => {
    onFeedbackChange(localFeedback);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLocalFeedback(feedback || '');
    setIsEditing(false);
  };

  const handleClear = () => {
    setLocalFeedback('');
    onFeedbackChange('');
    setIsEditing(false);
  };

  return (
    <Container hasFeedback={hasFeedback}>
      {hasFeedback && <FeedbackBadge>Edit pending</FeedbackBadge>}
      <EditButton className="edit-button" onClick={() => setIsEditing(!isEditing)}>
        {isEditing ? 'Close' : 'Edit'}
      </EditButton>

      {children}

      {isEditing && (
        <FeedbackInputContainer>
          <FeedbackLabel>Feedback for {sectionLabel}</FeedbackLabel>
          <FeedbackTextarea
            value={localFeedback}
            onChange={(e) => setLocalFeedback(e.target.value)}
            placeholder={`Describe what you'd like to change about this ${sectionLabel.toLowerCase()}...`}
          />
          <FeedbackActions>
            {hasFeedback && (
              <SmallButton onClick={handleClear}>Clear</SmallButton>
            )}
            <SmallButton onClick={handleCancel}>Cancel</SmallButton>
            <SmallButton variant="primary" onClick={handleSave}>
              Save Feedback
            </SmallButton>
          </FeedbackActions>
        </FeedbackInputContainer>
      )}
    </Container>
  );
}
