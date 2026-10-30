import { FileUp } from "lucide-react";
import { useId, useRef, useState, type ChangeEvent } from "react";
import { cn } from "../utils";
import { Button } from "./Button";
import { Textarea } from "./TextArea";

export type TextFileFieldLabels = {
  /** Button that opens the file picker. */
  choose: string;
  /** Accessible name for the text area. */
  textLabel: string;
  placeholder?: string;
  /** Shown when the text or file exceeds `maxBytes`. */
  tooLarge: string;
  /** Shown when JSON is expected and the text does not parse. */
  invalidJson: string;
  /** Shown when the browser could not read the chosen file. */
  readFailed: string;
};

export type TextFileFieldProps = {
  value: string;
  onChange: (value: string) => void;
  /** File picker filter; also decides whether JSON is enforced (when it names json). */
  accept?: string;
  maxBytes?: number;
  /** Extra check run on non-empty text. Return an error message or null. */
  validate?: (text: string) => string | null;
  labels: TextFileFieldLabels;
  /** External error (e.g. from the server); wins over local validation. */
  error?: string;
  rows?: number;
  disabled?: boolean;
  className?: string;
};

export const DEFAULT_TEXT_FILE_MAX_BYTES = 65536;

/**
 * Local checks for text coming from a file or a paste. Returns the message to
 * show, or null when the text is acceptable. Empty text is never an error.
 */
export function checkTextFile(
  text: string,
  opts: {
    maxBytes?: number;
    requireJson?: boolean;
    validate?: (text: string) => string | null;
    labels: Pick<TextFileFieldLabels, "tooLarge" | "invalidJson">;
  },
): string | null {
  if (text === "") return null;
  const maxBytes = opts.maxBytes ?? DEFAULT_TEXT_FILE_MAX_BYTES;
  if (new TextEncoder().encode(text).length > maxBytes) return opts.labels.tooLarge;
  if (opts.requireJson) {
    try {
      JSON.parse(text);
    } catch {
      return opts.labels.invalidJson;
    }
  }
  return opts.validate?.(text) ?? null;
}

/** Choose a text file or paste its contents; size- and JSON-checked. Content is never logged. */
export function TextFileField({
  value,
  onChange,
  accept = ".json,application/json",
  maxBytes = DEFAULT_TEXT_FILE_MAX_BYTES,
  validate,
  labels,
  error,
  rows = 6,
  disabled,
  className,
}: TextFileFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const [fileError, setFileError] = useState<string | null>(null);
  const requireJson = /json/i.test(accept);

  const valueError = checkTextFile(value, { maxBytes, requireJson, validate, labels });
  const shown = error ?? fileError ?? valueError;

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow choosing the same file again
    if (!file) return;
    if (file.size > maxBytes) {
      setFileError(labels.tooLarge);
      return;
    }
    try {
      const text = await file.text();
      setFileError(null);
      onChange(text);
    } catch {
      setFileError(labels.readFailed);
    }
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          <FileUp className="size-3.5" aria-hidden />
          {labels.choose}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          hidden
          tabIndex={-1}
          aria-hidden
          data-testid="text-file-input"
          onChange={onFile}
        />
      </div>
      <Textarea
        aria-label={labels.textLabel}
        aria-invalid={shown ? true : undefined}
        aria-describedby={shown ? errorId : undefined}
        error={Boolean(shown)}
        value={value}
        rows={rows}
        disabled={disabled}
        placeholder={labels.placeholder}
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="off"
        className="font-mono text-xs"
        onChange={(e) => {
          setFileError(null);
          onChange(e.target.value);
        }}
      />
      {shown && (
        <p id={errorId} role="alert" className="text-xs text-text-error">
          {shown}
        </p>
      )}
    </div>
  );
}
