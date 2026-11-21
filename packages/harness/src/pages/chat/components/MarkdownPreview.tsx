import { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { languageForPath } from '../../../lib/missionChanges';

function Highlight({ code, language }: { code: string; language: string }) {
  const [highlight, setHighlight] = useState<{ code: string; language: string; html: string }>();
  useEffect(() => {
    let active = true;
    void import('monaco-editor')
      .then(m => {
        const id =
          m.languages
            .getLanguages()
            .find(l => l.id === language || l.aliases?.some(a => a.toLowerCase() === language))
            ?.id ?? languageForPath('x.' + language);
        return m.editor.colorize(code, id, {});
      })
      .then(colors => {
        if (active) setHighlight({ code, language, html: colors });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [code, language]);
  // Monaco escapes the source while generating syntax-colored spans.
  return highlight?.code === code && highlight.language === language ? (
    <code className="monaco-editor" dangerouslySetInnerHTML={{ __html: highlight.html }} />
  ) : (
    <code>{code}</code>
  );
}

export default function MarkdownPreview({ text }: { text: string }) {
  return (
    <article className="min-h-0 flex-1 overflow-auto p-4 text-sm [&_a]:underline [&_h1]:my-3 [&_h1]:text-2xl [&_h2]:my-2 [&_h2]:text-xl [&_h3]:font-bold [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_pre]:overflow-auto [&_pre]:p-2 [&_td]:border [&_td]:p-1 [&_th]:border [&_th]:p-1 [&_ul]:list-disc [&_ul]:pl-6">
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          img: ({ alt }) => <span>{alt}</span>,
          code: ({ className, children }) => {
            const language = className?.match(/language-(\S+)/)?.[1];
            return language ? (
              <Highlight language={language} code={String(children)} />
            ) : (
              <code>{children}</code>
            );
          },
        }}>
        {text}
      </Markdown>
    </article>
  );
}
