import { LuFileText, LuClipboardList } from 'react-icons/lu';
import type { PersonAttachment, Visit, VisitAttachment } from '@shared/types/api';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import visitsLayout from '@shared/styles/VisitsLayout.module.css';
import { DocumentsList } from '@features/documents';
import DocumentsSidebar, { type DocumentTypeFilter } from '@features/documents/components/DocumentsSidebar';
import MobileFilterBar, { type MobileFilterOption } from '@shared/components/MobileFilterBar';

type DocumentItem =
  | (VisitAttachment & { visit: Visit; type: 'visit' })
  | (PersonAttachment & { type: 'person' });

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

  const filterOptions: MobileFilterOption[] = [
    {
      key: 'all',
      label: 'All',
      count: documents.length,
      icon: LuFileText,
      active: documentTypeFilter === 'all',
      isDefault: true,
      onSelect: () => onChangeDocumentTypeFilter('all'),
    },
    {
      key: 'visit',
      label: 'Visit Docs',
      count: visitDocsCount,
      icon: LuFileText,
      active: documentTypeFilter === 'visit',
      onSelect: () => onChangeDocumentTypeFilter('visit'),
    },
    {
      key: 'vaccine',
      label: 'Vaccine Reports',
      count: vaccineDocsCount,
      icon: LuClipboardList,
      active: documentTypeFilter === 'vaccine',
      onSelect: () => onChangeDocumentTypeFilter('vaccine'),
    },
  ];

  return (
    <div className={visitsLayout.pageLayout}>
      <MobileFilterBar title="Filter documents" options={filterOptions} />
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
