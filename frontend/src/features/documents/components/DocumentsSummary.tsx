import SummaryCardBase from '@shared/components/SummaryCardBase';

interface Props {
  total: number;
  visitDocuments: number;
  childDocuments: number;
  className?: string;
}

function DocumentsSummary({ total, visitDocuments, childDocuments, className = '' }: Props) {
  const stats = [
    { label: 'Total', value: total },
    { label: 'Visit Docs', value: visitDocuments },
    { label: 'Vaccine Reports', value: childDocuments },
  ];

  return <SummaryCardBase title="Documents" stats={stats} className={className} />;
}

export default DocumentsSummary;
