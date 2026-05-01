import type { Visit } from '@shared/types/api';
import { VaccineHistory } from '@features/medical';

type Props = {
  visitsWithVaccines: Visit[];
  personId: number;
  onUploadSuccess: () => Promise<void>;
};

export default function VaccinesTab({ visitsWithVaccines, personId, onUploadSuccess }: Props) {
  return <VaccineHistory visits={visitsWithVaccines} personId={personId} onUploadSuccess={onUploadSuccess} />;
}
