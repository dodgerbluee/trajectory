import { useState } from 'react';
import Card from '../Card';
import Button from '../Button';
import type { FamilyMember } from '../../types/api';
import styles from './FamilyOverviewCard.module.css';

interface FamilyOverviewCardProps {
  familyName: string;
  members: FamilyMember[];
  isOwner?: boolean;
  onRename?: (newName: string) => void;
  onRequestDelete?: () => void;
  onLeave?: () => void;
  isRenaming?: boolean;
  isDeleting?: boolean;
  isLeaving?: boolean;
  /** When true, render only the overview content without a Card wrapper (for use inside a parent card). */
  noCard?: boolean;
}

function FamilyOverviewCard({
  familyName,
  members,
  isOwner,
  onRename,
  onRequestDelete,
  onLeave,
  isRenaming,
  isDeleting,
  isLeaving,
  noCard = false,
}: FamilyOverviewCardProps) {
  const [editingName, setEditingName] = useState(false);
  const [editValue, setEditValue] = useState(familyName);

  const owner = members.find((m) => m.role === 'owner');
  const memberCount = members.length;

  const startEdit = () => {
    setEditValue(familyName);
    setEditingName(true);
  };

  const saveEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== familyName && onRename) {
      onRename(trimmed);
    }
    setEditingName(false);
  };

  const cancelEdit = () => {
    setEditValue(familyName);
    setEditingName(false);
  };

  const content = (
    <div className="family-settings-overview">
        <div className="family-settings-overview-row">
          <span className="family-settings-overview-label">Family</span>
          {editingName ? (
            <div className="family-settings-overview-edit">
              <input
                type="text"
                className="form-input family-settings-overview-edit-input"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEdit();
                  if (e.key === 'Escape') cancelEdit();
                }}
                aria-label="Family name"
                autoFocus
              />
              <Button variant="primary" size="sm" onClick={saveEdit} disabled={isRenaming || !editValue.trim()}>
                {isRenaming ? 'Saving…' : 'Save'}
              </Button>
              <Button variant="secondary" size="sm" onClick={cancelEdit} disabled={isRenaming}>
                Cancel
              </Button>
            </div>
          ) : (
            <span className="family-settings-overview-value">{familyName}</span>
          )}
        </div>
        <div className="family-settings-overview-row">
          <span className="family-settings-overview-label">Owner</span>
          <span className="family-settings-overview-value">{owner?.username ?? '—'}</span>
        </div>
        <div className="family-settings-overview-row">
          <span className="family-settings-overview-label">Members</span>
          <span className="family-settings-overview-value">{memberCount}</span>
        </div>
        {!editingName && (isOwner ? (onRename || onRequestDelete) : onLeave) && (
          <div className="family-settings-overview-actions">
            {isOwner && onRename && (
              <Button variant="secondary" size="sm" onClick={startEdit}>
                Rename
              </Button>
            )}
            {isOwner && onRequestDelete && (
              <Button
                variant="danger"
                size="sm"
                onClick={onRequestDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting…' : 'Delete family'}
              </Button>
            )}
            {!isOwner && onLeave && (
              <Button
                variant="danger"
                size="sm"
                onClick={onLeave}
                disabled={isLeaving}
              >
                {isLeaving ? 'Leaving…' : 'Leave family'}
              </Button>
            )}
          </div>
        )}
    </div>
  );

  if (noCard) return content;
  return (
    <Card className={`${styles.card} ${styles.cardOverview}`}>
      {content}
    </Card>
  );
}

export default FamilyOverviewCard;
