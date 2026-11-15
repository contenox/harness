import { Button } from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import type { useCursorPages } from './useCursorPages';

export function CursorPager({
  pages,
  next,
}: {
  pages: ReturnType<typeof useCursorPages>;
  next?: string;
}) {
  const { t } = useTranslation();
  if (!pages.cursor && !next) return null;
  return (
    <nav className="flex gap-2">
      {pages.cursor && <Button onClick={pages.previous}>{t('subscriptions.previousPage')}</Button>}
      {next && <Button onClick={() => pages.next(next)}>{t('subscriptions.nextPage')}</Button>}
    </nav>
  );
}
