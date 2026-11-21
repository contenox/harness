import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { readDelimited, readOffice, type Section } from '../lib/officePreview';

function SectionView({ sections }: { sections: Section[] }) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const selected = sections[index] ? index : 0;
  const section = sections[selected];
  if (!section) return <p className="p-2 text-sm">{t('preview.empty')}</p>;
  return (
    <div className="min-h-0 flex-1 overflow-auto px-3 py-2 text-sm">
      {sections.length > 1 && (
        <select
          aria-label={t('preview.section')}
          value={selected}
          onChange={e => setIndex(Number(e.target.value))}
          className="bg-panel mb-2 rounded border p-1">
          {sections.map((s, i) => (
            <option key={i} value={i}>
              {s.name}
            </option>
          ))}
        </select>
      )}
      {section.rows ? (
        <table className="w-max min-w-full border-collapse text-xs">
          <tbody>
            {section.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className="border-line max-w-96 border px-2 py-1 align-top whitespace-pre-wrap">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        section.paragraphs?.map((p, i) => (
          <p key={i} className="mb-2 break-words whitespace-pre-wrap">
            {p}
          </p>
        ))
      )}
    </div>
  );
}

export default function DocumentPreview({ data, ext }: { data: Uint8Array; ext: string }) {
  const { t } = useTranslation();
  const result = useMemo(() => {
    try {
      return { sections: readOffice(data, ext) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }, [data, ext]);
  return result.sections ? (
    <SectionView sections={result.sections} />
  ) : (
    <p role="alert" className="p-3 text-sm">
      {t('workspace.peek_error')} · {result.error}
    </p>
  );
}

export function DelimitedPreview({ text, ext }: { text: string; ext: string }) {
  const sections = useMemo(
    () => [{ name: ext, rows: readDelimited(text, ext === 'tsv' ? '\t' : ',') }],
    [text, ext],
  );
  return <SectionView sections={sections} />;
}
