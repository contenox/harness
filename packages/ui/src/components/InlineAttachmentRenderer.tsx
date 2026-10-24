import { useState } from "react";
import { stripAnsi } from "../ansi";
import { CodeBlock } from "./CodeBlock";
import { Collapsible } from "./Collapsible";
import { Dialog } from "./Dialog";
import { Span } from "./Typography";
import { FileText, TerminalSquare, ListChecks, Workflow, Database } from "lucide-react";

export type InlineAttachment =
  | { kind: "file_view"; path: string; text: string; truncated?: boolean }
  | {
      kind: "terminal_excerpt";
      output: string;
      command?: string;
      sessionId?: string;
      capturedAt?: string;
    }
  | {
      kind: "plan_summary";
      planId: string;
      ordinal: number;
      description: string;
      status: string;
      summary?: string;
      failureClass?: string;
    }
  | { kind: "dag"; chainJSON: string; description?: string }
  | { kind: "state_unit"; name: string; data?: unknown }
  | {
      kind: "image";

      data: string;
      mimeType: string;

      alt?: string;
    };

export type InlineAttachmentLabels = {

  line?: string;

  lines?: string;

  truncated?: string;

  terminalOutput?: string;

  planStep?: string;

  description?: string;

  summary?: string;

  compiledChainDag?: string;

  capturedState?: string;

  noData?: string;

  imageAttachment?: string;

  expandImage?: string;

  closeImage?: string;
};

export type InlineAttachmentRendererProps = {
  attachment: InlineAttachment;
  labels?: InlineAttachmentLabels;
};

function FileViewAttachment({
  attachment,
  labels,
}: {
  attachment: Extract<InlineAttachment, { kind: "file_view" }>;
  labels?: InlineAttachmentLabels;
}) {
  const lineCount = attachment.text.split("\n").length;
  return (
    <Collapsible
      title={
        <span className="inline-flex items-center gap-1.5 text-xs">
          <FileText className="h-3.5 w-3.5" />
          <span className="font-mono">{attachment.path}</span>
          <Span variant="muted" className="text-[10px]">
            {lineCount}{" "}
            {lineCount === 1
              ? (labels?.line ?? "line")
              : (labels?.lines ?? "lines")}
            {attachment.truncated
              ? ` · ${labels?.truncated ?? "truncated"}`
              : ""}
          </Span>
        </span>
      }
      defaultExpanded={false}
      className="border-surface-300 dark:border-dark-surface-400 bg-surface-100 dark:bg-dark-surface-200 mt-2 rounded border"
    >
      <CodeBlock className="px-3 py-2 leading-relaxed">{attachment.text}</CodeBlock>
    </Collapsible>
  );
}

function TerminalExcerptAttachment({
  attachment,
  labels,
}: {
  attachment: Extract<InlineAttachment, { kind: "terminal_excerpt" }>;
  labels?: InlineAttachmentLabels;
}) {
  return (
    <Collapsible
      title={
        <span className="inline-flex items-center gap-1.5 text-xs">
          <TerminalSquare className="h-3.5 w-3.5" />
          <span>{labels?.terminalOutput ?? "Terminal output"}</span>
          {attachment.command && (
            <Span variant="muted" className="font-mono text-[10px]">
              $ {stripAnsi(attachment.command)}
            </Span>
          )}
        </span>
      }
      defaultExpanded={false}
      className="border-surface-300 dark:border-dark-surface-400 bg-surface-100 dark:bg-dark-surface-200 mt-2 rounded border"
    >
      <CodeBlock className="px-3 py-2 leading-relaxed">{stripAnsi(attachment.output)}</CodeBlock>
    </Collapsible>
  );
}

function PlanSummaryAttachment({
  attachment,
  labels,
}: {
  attachment: Extract<InlineAttachment, { kind: "plan_summary" }>;
  labels?: InlineAttachmentLabels;
}) {
  const statusColor =
    attachment.status === "completed"
      ? "text-success"
      : attachment.status === "failed"
        ? "text-error"
        : "text-text-muted";
  return (
    <Collapsible
      title={
        <span className="inline-flex items-center gap-1.5 text-xs">
          <ListChecks className="h-3.5 w-3.5" />
          <span>
            {labels?.planStep ?? "Plan step"} {attachment.ordinal}
          </span>
          <Span variant="muted" className={`text-[10px] ${statusColor}`}>
            · {attachment.status}
            {attachment.failureClass ? ` (${attachment.failureClass})` : ""}
          </Span>
        </span>
      }
      defaultExpanded={false}
      className="border-surface-300 dark:border-dark-surface-400 bg-surface-100 dark:bg-dark-surface-200 mt-2 rounded border"
    >
      <div className="space-y-1.5 px-3 py-2 text-xs">
        <div>
          <Span variant="muted" className="text-[10px]">
            {labels?.description ?? "Description"}
          </Span>
          <div className="text-text dark:text-dark-text mt-0.5">{attachment.description}</div>
        </div>
        {attachment.summary && (
          <div>
            <Span variant="muted" className="text-[10px]">
              {labels?.summary ?? "Summary"}
            </Span>
            <CodeBlock className="mt-0.5 text-[11px] whitespace-pre-wrap">
              {attachment.summary}
            </CodeBlock>
          </div>
        )}
      </div>
    </Collapsible>
  );
}

function DAGAttachment({
  attachment,
  labels,
}: {
  attachment: Extract<InlineAttachment, { kind: "dag" }>;
  labels?: InlineAttachmentLabels;
}) {
  return (
    <Collapsible
      title={
        <span className="inline-flex items-center gap-1.5 text-xs">
          <Workflow className="h-3.5 w-3.5" />
          <span>
            {attachment.description ??
              labels?.compiledChainDag ??
              "Compiled chain DAG"}
          </span>
        </span>
      }
      defaultExpanded={false}
      className="border-surface-300 dark:border-dark-surface-400 bg-surface-100 dark:bg-dark-surface-200 mt-2 rounded border"
    >
      <CodeBlock className="px-3 py-2 text-[11px] leading-relaxed">{attachment.chainJSON}</CodeBlock>
    </Collapsible>
  );
}

function StateUnitAttachment({
  attachment,
  labels,
}: {
  attachment: Extract<InlineAttachment, { kind: "state_unit" }>;
  labels?: InlineAttachmentLabels;
}) {
  const data =
    attachment.data == null
      ? null
      : typeof attachment.data === "string"
        ? attachment.data
        : JSON.stringify(attachment.data, null, 2);
  return (
    <Collapsible
      title={
        <span className="inline-flex items-center gap-1.5 text-xs">
          <Database className="h-3.5 w-3.5" />
          <span>{labels?.capturedState ?? "Captured state"}</span>
          <Span variant="muted" className="text-[10px]">
            · {attachment.name}
          </Span>
        </span>
      }
      defaultExpanded={false}
      className="border-surface-300 dark:border-dark-surface-400 bg-surface-100 dark:bg-dark-surface-200 mt-2 rounded border"
    >
      <CodeBlock className="px-3 py-2 text-[11px] leading-relaxed">
        {data ?? labels?.noData ?? "(no data)"}
      </CodeBlock>
    </Collapsible>
  );
}


function ImageAttachmentView({
  attachment,
  labels,
}: {
  attachment: Extract<InlineAttachment, { kind: "image" }>;
  labels?: InlineAttachmentLabels;
}) {
  const [expanded, setExpanded] = useState(false);
  const src = `data:${attachment.mimeType};base64,${attachment.data}`;
  const alt = attachment.alt ?? labels?.imageAttachment ?? "Attached image";
  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        aria-label={labels?.expandImage ?? "Show image full size"}
        title={labels?.expandImage ?? "Show image full size"}
        className="border-surface-300 dark:border-dark-surface-400 bg-surface-100 dark:bg-dark-surface-200 mt-2 block cursor-zoom-in overflow-hidden rounded border p-0"
      >
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="block max-h-64 max-w-full object-contain"
        />
      </button>
      <Dialog
        open={expanded}
        onClose={() => setExpanded(false)}
        title={alt}
        closeLabel={labels?.closeImage ?? "Close"}
        className="w-auto max-w-[90vw]"
      >
        <img src={src} alt={alt} className="max-h-[80vh] max-w-full rounded" />
      </Dialog>
    </>
  );
}

export function InlineAttachmentRenderer({
  attachment,
  labels,
}: InlineAttachmentRendererProps) {
  switch (attachment.kind) {
    case "file_view":
      return <FileViewAttachment attachment={attachment} labels={labels} />;
    case "terminal_excerpt":
      return (
        <TerminalExcerptAttachment attachment={attachment} labels={labels} />
      );
    case "plan_summary":
      return <PlanSummaryAttachment attachment={attachment} labels={labels} />;
    case "dag":
      return <DAGAttachment attachment={attachment} labels={labels} />;
    case "state_unit":
      return <StateUnitAttachment attachment={attachment} labels={labels} />;
    case "image":
      return <ImageAttachmentView attachment={attachment} labels={labels} />;
    default: {
      const exhaustive: never = attachment;
      void exhaustive;
      return null;
    }
  }
}

export function InlineAttachments({
  attachments,
  labels,
}: {
  attachments?: InlineAttachment[];
  labels?: InlineAttachmentLabels;
}) {
  if (!attachments || attachments.length === 0) return null;
  return (
    <div className="mt-1 space-y-2">
      {attachments.map((a, i) => (
        <InlineAttachmentRenderer key={i} attachment={a} labels={labels} />
      ))}
    </div>
  );
}
