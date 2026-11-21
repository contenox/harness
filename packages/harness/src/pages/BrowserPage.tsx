import { Button, IconButton } from '@contenox/ui';
import { ArrowLeft, ArrowRight, MessageSquare, RotateCw, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useAcpWorkspace } from '../hooks/useAcpWorkspace';
import { useBrowserRegistration } from '../hooks/useConnectors';
import { browserChatSession } from '../lib/browserWorkspace';
import { useStagedRoot } from '../lib/stagedRoot';

export default function BrowserPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { workspace } = useAcpWorkspace();
  const registration = useBrowserRegistration();
  const { setStagedRoot } = useStagedRoot();
  function goToChat() {
    const scope = registration.data?.id === id ? registration.data.workspace : undefined;
    const sessionId = browserChatSession(
      scope,
      workspace.activeSessionId,
      workspace.sessions,
      window.contenoxDesktop?.platform,
    );
    if (!sessionId && scope) setStagedRoot(scope);
    navigate(sessionId ? '/chat/' + encodeURIComponent(sessionId) : '/chat', { replace: true });
  }
  return (
    <BrowserPane
      id={id}
      onChat={registration.isFetching && registration.data?.id !== id ? undefined : goToChat}
      onClosed={() => navigate('/connectors', { replace: true })}
    />
  );
}

export function BrowserPane({
  id,
  onChat,
  onClosed,
}: {
  id: string;
  onChat?: () => void;
  onClosed: () => void;
}) {
  const { t } = useTranslation();
  const host = window.contenoxDesktop?.browser;
  const pane = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState('');
  const editing = useRef(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const el = pane.current;
    if (!host || !el) return;
    let active = true;
    let ready = false;
    const layout = () => {
      if (!active || !ready) return;
      const r = el.getBoundingClientRect();
      const obscured =
        document.hidden ||
        !!document.querySelector('[aria-modal="true"],[role="menu"],[role="dialog"]');
      void host.layout(id, obscured ? null : { x: r.x, y: r.y, width: r.width, height: r.height });
    };
    const size = new ResizeObserver(layout);
    size.observe(el);
    const overlays = new MutationObserver(layout);
    overlays.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('visibilitychange', layout);
    const off = host.subscribe(state => {
      if (!editing.current) setUrl(state.url);
    });
    void host
      .mount(id)
      .then(state => {
        if (!active) return;
        if (state.error) return setError(state.error);
        ready = true;
        if (!editing.current) setUrl(state.url || '');
        layout();
      })
      .catch(e => active && setError(String(e)));
    return () => {
      active = false;
      size.disconnect();
      overlays.disconnect();
      off();
      document.removeEventListener('visibilitychange', layout);
      void host.layout(id, null);
    };
  }, [host, id]);
  async function close() {
    try {
      const result = await host?.close(id);
      if (result?.error) return setError(result.error);
      onClosed();
    } catch (e) {
      setError(String(e));
    }
  }
  async function act(action: string) {
    editing.current = false;
    setError('');
    const target = /^https?:\/\//i.test(url) ? url : 'https://' + url;
    try {
      const result = await host?.action(
        id,
        action,
        action === 'navigate' ? { url: target } : undefined,
      );
      if (result?.error) setError(result.error);
    } catch (e) {
      setError(String(e));
    }
  }
  return (
    <section className="flex h-full min-h-0 flex-col" aria-label="Browser">
      <form
        className="border-line flex items-center gap-1.5 border-b px-3 py-2"
        onSubmit={e => {
          e.preventDefault();
          void act('navigate');
        }}>
        <Button type="button" size="sm" variant="secondary" disabled={!onChat} onClick={onChat}>
          <MessageSquare size={15} aria-hidden /> {t('browser.to_chat')}
        </Button>
        <IconButton type="button" label={t('browser.back')} onClick={() => void act('back')}>
          <ArrowLeft size={16} />
        </IconButton>
        <IconButton type="button" label={t('browser.forward')} onClick={() => void act('forward')}>
          <ArrowRight size={16} />
        </IconButton>
        <IconButton type="button" label={t('browser.reload')} onClick={() => void act('reload')}>
          <RotateCw size={16} />
        </IconButton>
        <input
          className="bg-raised min-w-0 flex-1 rounded px-2 py-1"
          aria-label={t('browser.address')}
          placeholder={t('browser.address')}
          value={url}
          onBlur={() => {
            editing.current = false;
          }}
          onChange={e => {
            editing.current = true;
            setUrl(e.target.value);
          }}
        />
        <Button type="button" size="sm" variant="ghost" onClick={() => void close()}>
          <X size={15} aria-hidden /> {t('browser.close')}
        </Button>
      </form>
      {error && (
        <p role="alert" className="px-3 py-1">
          {error}
        </p>
      )}
      <div ref={pane} className="min-h-0 flex-1" />
    </section>
  );
}
