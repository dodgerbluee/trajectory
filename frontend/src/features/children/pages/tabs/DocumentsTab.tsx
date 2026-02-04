import type { ChildAttachment, Visit, VisitAttachment } from '@shared/types/api';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import visitsLayout from '@shared/styles/VisitsLayout.module.css';
import { DocumentsList } from '@features/documents';
import DocumentsSidebar, { type DocumentTypeFilter } from '@features/documents/components/DocumentsSidebar';

type DocumentItem =
  | (VisitAttachment & { visit: Visit; type: 'visit' })
  | (ChildAttachment & { type: 'child' });

type Props = {
  loading: boolean;
  documents: DocumentItem[];
  visitDocsCount: number;
  vaccineDocsCount: number;
  documentTypeFilter: DocumentTypeFilter;
  onChangeDocumentTypeFilter: (filter: DocumentTypeFilter) => void;
  filteredDocuments: DocumentItem[];
  onUpdate: () => Promise<void>;
};

export default function DocumentsTab({
  loading,
  documents,
  visitDocsCount,
  vaccineDocsCount,
  documentTypeFilter,
  onChangeDocumentTypeFilter,
  filteredDocuments,
  onUpdate,
}: Props) {
  if (loading) {
    return <LoadingSpinner message="Loading documents..." />;
  }

  return (
    <div className={visitsLayout.pageLayout}>
      <DocumentsSidebar
        total={documents.length}
        visitCount={visitDocsCount}
        vaccineCount={vaccineDocsCount}
        filter={documentTypeFilter}
        onFilterChange={onChangeDocumentTypeFilter}
      />
      <main className={visitsLayout.main}>
        <DocumentsList documents={filteredDocuments} onUpdate={onUpdate} showHeader={false} />
      </main>
    </div>
  );
}
