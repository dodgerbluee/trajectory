import SummaryCardBase from '@shared/components/SummaryCardBase';

interface Props {
  total: number;
  visitDocuments: number;
  personDocuments: number;
  className?: string;
}

function DocumentsSummary({ total, visitDocuments, personDocuments, className = '' }: Props) {
  const stats = [
    { label: 'Total', value: total },
    { label: 'Visit Docs', value: visitDocuments },
    { label: 'Vaccine Reports', value: personDocuments },
  ];

  return <SummaryCardBase title="Documents" stats={stats} className={className} />;
}

export default DocumentsSummary;
