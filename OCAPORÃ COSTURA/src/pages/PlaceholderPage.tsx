import { EmptyState } from '@/components/EmptyState';

interface PlaceholderPageProps {
  title: string;
  icon: string;
  description: string;
  phase: string;
}

export function PlaceholderPage({
  title,
  icon,
  description,
  phase,
}: PlaceholderPageProps) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={`${description} Esta funcionalidade será implementada na ${phase}.`}
    />
  );
}
