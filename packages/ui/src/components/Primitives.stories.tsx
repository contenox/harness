import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Plus, Settings } from "lucide-react";
import { RadioCardGroup } from "./RadioCard";
import { TitleBar } from "./TitleBar";
import { OneTimeCode } from "./OneTimeCode";
import { Step, Steps } from "./Steps";
import { Chip } from "./Chip";
import { IconButton } from "./IconButton";
import { Kbd } from "./Kbd";
import { PaneFrame } from "./PaneFrame";
import { Popover } from "./Popover";
import { SidebarItem } from "./SidebarItem";
import { SidebarSection } from "./SidebarSection";

const meta: Meta = { title: "Components/Primitives" };
export default meta;
type Story = StoryObj;

export const IconButtons: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <IconButton label="Add" size="xs"><Plus className="size-3.5" /></IconButton>
      <IconButton label="Add" size="sm"><Plus className="size-4" /></IconButton>
      <IconButton label="Settings"><Settings className="size-4" /></IconButton>
      <IconButton label="Settings" variant="outline" size="lg"><Settings className="size-4" /></IconButton>
    </div>
  ),
};

export const Chips: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Chip label="Ghost" caret />
      <Chip label="Outline" variant="outline" icon={<Plus />} caret />
      <Chip label="Disabled" disabled />
    </div>
  ),
};

export const PopoverUpward: Story = {
  render: () => (
    <div className="flex h-64 items-end">
      <Popover side="top" trigger={<Chip label="Open" caret variant="outline" />}>
        Anything can go in here.
      </Popover>
    </div>
  ),
};

export const Sidebar: Story = {
  render: () => (
    <div className="w-64 bg-sidebar p-2">
      <SidebarSection title="Recents" collapsible action={<IconButton label="New" size="xs"><Plus className="size-3.5" /></IconButton>}>
        <SidebarItem active>Active item</SidebarItem>
        <SidebarItem level={1} meta="2h" expanded={false} trailing={<IconButton label="Settings" size="xs"><Settings className="size-3.5" /></IconButton>}>
          Nested item with trailing action
        </SidebarItem>
      </SidebarSection>
    </div>
  ),
};

export const Pane: Story = {
  render: () => (
    <div className="h-72 w-96">
      <PaneFrame title="Details" onClose={() => {}}>Body</PaneFrame>
    </div>
  ),
};

export const Keys: Story = {
  render: () => (
    <span className="flex gap-1"><Kbd>Ctrl</Kbd><Kbd>Enter</Kbd></span>
  ),
};

export const ToggledIconButton: Story = {
  render: () => (
    <div className="flex items-center gap-1">
      <IconButton label="Terminal" active><Settings className="size-4" /></IconButton>
      <IconButton label="Files" active={false}><Plus className="size-4" /></IconButton>
    </div>
  ),
};

export const RadioCards: Story = {
  render: function Render() {
    const [value, setValue] = useState("a");
    return (
      <RadioCardGroup
        aria-label="Provider"
        value={value}
        onChange={setValue}
        options={[
          { value: "a", label: "OpenAI", description: "API key" },
          { value: "b", label: "Ollama" },
        ]}
      />
    );
  },
};

export const WindowTitleBar: Story = {
  render: () => (
    <TitleBar start={<IconButton label="Toggle sidebar"><Settings className="size-4" /></IconButton>} end={<IconButton label="Terminal" active><Plus className="size-4" /></IconButton>} reserveEnd={0}>
      <span className="truncate text-sm font-medium">Session title</span>
    </TitleBar>
  ),
};

export const DeviceCodeSteps: Story = {
  render: () => (
    <div className="max-w-sm">
      <Steps>
        <Step number={1} title="Sign in in your browser" done>
          We opened the ChatGPT sign-in page for you.
        </Step>
        <Step number={2} title="Enter this code">
          <OneTimeCode value="PLGQ-T2YJJ" copyLabel="Copy" copiedLabel="Copied" copied />
        </Step>
        <Step number={3} title="Confirm access">
          Allow Contenox to use your ChatGPT account. This window continues automatically.
        </Step>
      </Steps>
    </div>
  ),
};
