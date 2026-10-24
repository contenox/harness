import { ArrowLeft } from 'lucide-react';
import { Button } from './Button';

export function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" className="gap-2 self-start" onClick={onClick}>
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Button>
  );
}
