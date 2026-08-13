// ─── Barrel de componentes compartidos ───────────────────────────────────────
// Importa desde aquí para simplificar las rutas en las screens.
//
// Uso: import { ScreenHeader, EmptyState, StatCard } from '../../shared/components';

export { ScreenHeader } from './ScreenHeader';
export { EmptyState } from './EmptyState';
export { StatCard } from './StatCard';
export { ConfirmModal } from './ConfirmModal';
export { FormInput } from './FormInput';
export { PrimaryButton } from './PrimaryButton';
export { AvatarInitials } from './AvatarInitials';
export { SyncIndicator } from './SyncIndicator';
export { TimePickerModal } from './TimePickerModal';
export {
  Skeleton,
  PatientCardSkeleton,
  PatientListSkeleton,
  DashboardSkeleton,
  AgendaSkeleton,
  FinanceSkeleton,
} from './SkeletonLoader';
