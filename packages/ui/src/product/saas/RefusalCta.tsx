import { Button } from '../../components/Button';
import { InlineNotice } from '../../components/InlineNotice';
import { useNavigate } from 'react-router-dom';
import { useProductPorts } from '../ports';

/**
 * Renders the way forward from a commercial refusal, when `lib/refusals.ts` knows one.
 */
export function RefusalCta({ error }: { error: unknown }) {
  const { refusalSell } = useProductPorts();
  const navigate = useNavigate();
  const sell = refusalSell(error);
  if (sell === null) return null;

  const act = () => {
    if (sell.cta.href.startsWith('mailto:')) {
      window.location.href = sell.cta.href;
      return;
    }
    void navigate(sell.cta.href);
  };

  const button = (
    <Button variant="primary" className="self-start" onClick={act}>
      {sell.cta.label}
    </Button>
  );

  if (sell.message === null) return button;
  return (
    <InlineNotice variant="info" role="status">
      <div className="flex flex-col gap-3">
        <span>{sell.message}</span>
        {button}
      </div>
    </InlineNotice>
  );
}
