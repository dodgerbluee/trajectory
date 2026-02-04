import type { Visit } from '@shared/types/api';
import { VaccineHistory } from '@features/medical';

type Props = {
  visitsWithVaccines: Visit[];
  childId: number;
  onUploadSuccess: () => Promise<void>;
};

export default function VaccinesTab({ visitsWithVaccines, childId, onUploadSuccess }: Props) {
  return <VaccineHistory visits={visitsWithVaccines} childId={childId} onUploadSuccess={onUploadSuccess} />;
}
