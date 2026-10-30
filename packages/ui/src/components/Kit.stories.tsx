import { useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Archive, FolderOpen, MessageSquare, Plus, Search as SearchIcon, Settings, Trash2, X } from "lucide-react";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { Card } from "./Card";
import { Checkbox } from "./Checkbox";
import { Chip } from "./Chip";
import { ChatComposer } from "./chat/ChatComposer";
import { Dialog, DialogFooter } from "./Dialog";
import { Dropdown, DropdownItem, DropdownLabel, DropdownSeparator } from "./Dropdown";
import { IconButton } from "./IconButton";
import { InlineNotice } from "./InlineNotice";
import { Input } from "./Input";
import { Kbd } from "./Kbd";
import { PaneFrame } from "./PaneFrame";
import { Panel } from "./Panel";
import { Popover } from "./Popover";
import { SearchBar } from "./SearchBar";
import { Select } from "./Select";
import { SidebarItem } from "./SidebarItem";
import { SidebarSection } from "./SidebarSection";
import { StatusIndicator } from "./StatusIndicator";
import { Switch } from "./Switch";
import { Tabs } from "./Tabs";
import { Textarea } from "./TextArea";
import { Tooltip } from "./Tooltip";
import { H1, H2, H3, P, Small } from "./Typography";

const meta: Meta = {
  title: "Foundations/Kit overview",
  parameters: { layout: "fullscreen" },
};
export default meta;
type Story = StoryObj;

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[11px] font-medium tracking-[0.02em] text-text-subtle">{title}</h2>
      {children}
    </section>
  );
}

function Swatch({ name, cls, note }: { name: string; cls: string; note?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`size-8 shrink-0 rounded-lg border border-line-strong ${cls}`} />
      <div className="min-w-0 leading-tight">
        <div className="text-[13px] font-medium">{name}</div>
        {note && <div className="text-xs text-text-subtle">{note}</div>}
      </div>
    </div>
  );
}

function KitOverview() {
  const [tab, setTab] = useState("a");
  const [dialog, setDialog] = useState(false);
  const [sw, setSw] = useState(true);
  const [val, setVal] = useState("");
  const [composer, setComposer] = useState("");
  const [active, setActive] = useState("thread-2");
  const variants = ["primary", "secondary", "outline", "ghost", "danger", "text"] as const;
  const sizes = ["xs", "sm", "md", "lg"] as const;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 p-6 text-text">
      <Block title="COLOR TOKENS">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Swatch name="app" cls="bg-app" />
          <Swatch name="sidebar" cls="bg-sidebar" />
          <Swatch name="raised" cls="bg-raised" />
          <Swatch name="solid / primary" cls="bg-solid" />
          <Swatch name="hover" cls="bg-hover" />
          <Swatch name="selected" cls="bg-selected" />
          <Swatch name="line" cls="bg-line" note="border" />
          <Swatch name="line-strong" cls="bg-line-strong" note="strong border" />
          <Swatch name="accent" cls="bg-accent" note="focus / links" />
          <Swatch name="error" cls="bg-error" />
          <Swatch name="warning" cls="bg-warning" />
          <Swatch name="success" cls="bg-success" />
        </div>
        <div className="flex flex-wrap gap-6">
          <span className="text-text">text</span>
          <span className="text-text-muted">text-muted</span>
          <span className="text-text-subtle">text-subtle</span>
          <span className="text-link">text-link</span>
          <span className="text-text-error">error</span>
          <span className="text-text-warning">warning</span>
          <span className="text-text-success">success</span>
        </div>
      </Block>

      <Block title="TYPE SCALE">
        <div className="flex flex-col gap-1.5">
          <H1>Heading 1 / page title</H1>
          <H2>Heading 2 / section</H2>
          <H3>Heading 3 / card title</H3>
          <P>Body 14px / 1.5. The quick brown fox jumps over the lazy dog.</P>
          <Small>Small 13px. The quick brown fox jumps over the lazy dog.</Small>
          <span className="text-xs text-text-muted">Extra small 12px muted</span>
          <span className="text-[11px] font-medium tracking-[0.02em] text-text-subtle">SECTION HEADER 11PX</span>
          <code className="font-mono text-[13px]">Geist Mono: const x = 42;</code>
        </div>
      </Block>

      <Block title="BUTTONS: VARIANT x SIZE">
        <div className="flex flex-col gap-3">
          {variants.map((v) => (
            <div key={v} className="flex flex-wrap items-center gap-2">
              <span className="w-16 text-xs text-text-subtle">{v}</span>
              {sizes.map((s) => (
                <Button key={s} variant={v} size={s}>
                  {s}
                </Button>
              ))}
              <Button variant={v} disabled>
                disabled
              </Button>
              <Button variant={v} isLoading>
                loading
              </Button>
              <Button variant={v}>
                <Plus className="size-4" /> icon + label
              </Button>
              <Button variant={v} size="icon" aria-label="settings">
                <Settings className="size-4" />
              </Button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <span className="w-16 text-xs text-text-subtle">solid danger</span>
            <Button variant="danger" solid>
              Delete
            </Button>
          </div>
        </div>
      </Block>

      <Block title="ICONBUTTON / CHIP / KBD">
        <div className="flex flex-wrap items-center gap-3">
          <IconButton label="Settings" size="xs"><Settings className="size-3.5" /></IconButton>
          <IconButton label="Settings" size="sm"><Settings className="size-4" /></IconButton>
          <IconButton label="Settings"><Settings className="size-4" /></IconButton>
          <IconButton label="Delete" variant="outline"><Trash2 className="size-4" /></IconButton>
          <IconButton label="Send" variant="primary"><Plus className="size-4" /></IconButton>
          <Chip label="Model" icon={<MessageSquare />} caret />
          <Chip label="Outline" variant="outline" caret />
          <Chip label="Active" active caret />
          <span className="flex items-center gap-1"><Kbd>Ctrl</Kbd><Kbd>K</Kbd></span>
        </div>
      </Block>

      <Block title="INPUTS">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="Input" value={val} onChange={(e) => setVal(e.target.value)} />
          <Input placeholder="Error" error />
          <Input placeholder="Disabled" disabled />
          <Select options={[{ value: "a", label: "Select option A" }, { value: "b", label: "Option B" }]} />
          <SearchBar placeholder="Search" value={val} onChange={(e) => setVal(e.target.value)} onClear={() => setVal("")} />
          <Textarea placeholder="Textarea" rows={3} />
          <div className="flex items-center gap-6">
            <Checkbox label="Checkbox" defaultChecked />
            <Checkbox label="Unchecked" />
            <Switch checked={sw} onChange={(e) => setSw(e.target.checked)} />
            <Switch disabled />
          </div>
        </div>
      </Block>

      <Block title="BADGE / STATUS / NOTICE">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>default</Badge>
          <Badge variant="secondary">secondary</Badge>
          <Badge variant="outline">outline</Badge>
          <Badge variant="accent">accent</Badge>
          <Badge variant="success">success</Badge>
          <Badge variant="warning">warning</Badge>
          <Badge variant="error">error</Badge>
          <Badge size="sm">sm</Badge>
        </div>
        <div className="flex flex-wrap gap-6">
          <StatusIndicator status="completed" label="Completed" />
          <StatusIndicator status="in-progress" label="Running" />
          <StatusIndicator status="error" label="Failed" />
          <StatusIndicator status="planned" label="Planned" />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <InlineNotice>Info notice, neutral tint.</InlineNotice>
          <InlineNotice variant="warning">Warning notice.</InlineNotice>
          <InlineNotice variant="error" onDismiss={() => {}}>Error notice, dismissible.</InlineNotice>
          <InlineNotice variant="success">Success notice.</InlineNotice>
        </div>
      </Block>

      <Block title="CARD / PANEL / TABS">
        <div className="grid gap-3 sm:grid-cols-2">
          <Card><H3>Card</H3><P variant="muted">Raised surface, 12px radius, hairline border, flat.</P></Card>
          <Card interactive><H3>Interactive card</H3><P variant="muted">Hover for overlay.</P></Card>
          <Panel variant="bordered">Panel bordered</Panel>
          <Panel variant="warning">Panel warning (tinted)</Panel>
        </div>
        <Tabs
          tabs={[{ id: "a", label: "Overview" }, { id: "b", label: "Files" }, { id: "c", label: "Closable", closable: true, closeLabel: "Close" }]}
          activeTab={tab}
          onTabChange={setTab}
          onClose={() => {}}
        />
      </Block>

      <Block title="DROPDOWN / POPOVER / DIALOG / TOOLTIP (open state shown)">
        <div className="flex min-h-72 flex-wrap items-start gap-8">
          <Dropdown
            isOpen
            trigger={<Chip label="Menu" caret active />}
          >
            <DropdownLabel>Section</DropdownLabel>
            <DropdownItem icon={<FolderOpen className="size-4" />}>Open folder</DropdownItem>
            <DropdownItem icon={<Archive className="size-4" />} selected>Selected</DropdownItem>
            <DropdownItem trailing="Ctrl+K">With shortcut</DropdownItem>
            <DropdownSeparator />
            <DropdownItem danger icon={<Trash2 className="size-4" />}>Delete</DropdownItem>
          </Dropdown>
          <Popover isOpen trigger={<Chip label="Popover" caret active variant="outline" />}>
            <div className="flex flex-col gap-2">
              <H3>Popover content</H3>
              <Input placeholder="Any content" />
              <Button size="sm">Apply</Button>
            </div>
          </Popover>
          <div className="flex items-end pt-52">
            <Popover isOpen side="top" trigger={<Chip label="Opens upward" caret active />}>
              <Small>Used by the composer.</Small>
            </Popover>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => setDialog(true)}>Open dialog</Button>
            <Tooltip content="Tooltip text"><Button variant="outline">Hover me</Button></Tooltip>
          </div>
        </div>
        <Dialog open={dialog} onClose={() => setDialog(false)} title="Delete session?">
          <P variant="muted">This removes the session and its transcript. This cannot be undone.</P>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(false)}>Cancel</Button>
            <Button variant="danger" solid onClick={() => setDialog(false)}>Delete</Button>
          </DialogFooter>
        </Dialog>
      </Block>

      <Block title="SIDEBAR + PANE FRAME">
        <div className="grid h-80 grid-cols-[260px_1fr] overflow-hidden rounded-xl border border-line">
          <div className="flex flex-col gap-3 overflow-auto bg-sidebar p-2">
            <SidebarSection title="Pinned">
              <SidebarItem icon={<SearchIcon />} onClick={() => {}}>Search</SidebarItem>
            </SidebarSection>
            <SidebarSection
              title="Projects"
              collapsible
              action={<IconButton label="New project" size="xs"><Plus className="size-3.5" /></IconButton>}
            >
              <SidebarItem icon={<FolderOpen />} onClick={() => {}}>harness</SidebarItem>
              {["thread-1", "thread-2", "thread-3"].map((id, i) => (
                <SidebarItem
                  key={id}
                  level={1}
                  active={active === id}
                  onClick={() => setActive(id)}
                  trailing={<IconButton label="Archive" size="xs"><Archive className="size-3.5" /></IconButton>}
                >
                  {i === 1 ? "A very long thread title that must truncate nicely" : `Thread ${i + 1}`}
                </SidebarItem>
              ))}
              <SidebarItem level={2} icon={<MessageSquare />}>Nested level 2</SidebarItem>
            </SidebarSection>
          </div>
          <PaneFrame
            title="Preview"
            actions={<IconButton label="Settings" size="sm"><Settings className="size-4" /></IconButton>}
            onClose={() => {}}
            closeLabel="Close pane"
          >
            <P variant="muted">Pane body scrolls. Header: title or tabs slot, actions, close.</P>
          </PaneFrame>
        </div>
      </Block>

      <Block title="CHAT COMPOSER">
        <div className="max-w-2xl">
          <ChatComposer
            value={composer}
            onChange={setComposer}
            onSubmit={() => setComposer("")}
            placeholder="Ask anything"
            showCharCount={false}
            footerStart={
              <>
                <IconButton label="Attach" size="sm"><Plus className="size-4" /></IconButton>
                <Chip label="gpt-5" caret />
                <Chip label="Auto" caret icon={<X />} />
              </>
            }
          />
        </div>
      </Block>
    </div>
  );
}

export const Overview: Story = { render: () => <KitOverview /> };
