import SummaryCardBase from './SummaryCardBase';

interface Props {
  totalVaccines: number;
  totalDoses: number;
  className?: string;
}

function VaccineSummary({ totalVaccines, totalDoses, className = '' }: Props) {
  const stats = [
    { label: 'Vaccine Types', value: totalVaccines },
    { label: 'Total Doses', value: totalDoses },
  ];

  return <SummaryCardBase title="Vaccination" stats={stats} className={className} />;
}

export default VaccineSummary;
