/**
 * Shared context type for visit form section components.
 * The page provides this; section components receive it and never
 * branch on visit type for "which section to show"—only for display hints (e.g. showTitle).
 */

import type { Child, CreateVisitInput, UpdateVisitInput, IllnessType, Visit, VisitAttachment } from '../types/api';

export type VisitFormMode = 'add' | 'edit';

export interface VisitFormContext {
  mode: VisitFormMode;
  formData: CreateVisitInput | UpdateVisitInput;
  /** Pages pass their own setState; sections use functional updates (prev => ({ ...prev, ... })). */
  setFormData: React.Dispatch<React.SetStateAction<CreateVisitInput | UpdateVisitInput>> | React.Dispatch<React.SetStateAction<CreateVisitInput>> | React.Dispatch<React.SetStateAction<UpdateVisitInput>>;
  submitting: boolean;
  /** Display hint: show Title field (e.g. for wellness). No visit-type logic inside sections. */
  showTitle: boolean;
  recentLocations: string[];
  recentDoctors: string[];
  getTodayDate: () => string;
  selectedIllnesses: IllnessType[];
  setSelectedIllnesses: React.Dispatch<React.SetStateAction<IllnessType[]>>;
  pendingFiles: File[];
  handleRemoveFile: (index: number) => void;
  handleFileUpload: (files: File | File[]) => void | Promise<void>;
  /** Add only */
  children?: Child[];
  selectedChildId?: number | null;
  setSelectedChildId?: React.Dispatch<React.SetStateAction<number | null>>;
  /** Edit only */
  visit?: Visit;
  visitId?: number;
  attachments?: VisitAttachment[];
  loadingAttachments?: boolean;
  handleAttachmentDelete?: (attachmentId: number) => void;
  onRefreshAttachments?: () => void;
}
