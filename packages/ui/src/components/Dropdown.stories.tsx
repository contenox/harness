import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { Dropdown, DropdownItem } from "./Dropdown";
import { Button } from "./Button";

const meta: Meta<typeof Dropdown> = {
  title: "Overlays/Dropdown",
  component: Dropdown,
  decorators: [
    (Story) => (
      <div style={{ padding: "4rem", minHeight: "240px" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Dropdown>;

const sampleOptions = [
  { value: "one", label: "Option One" },
  { value: "two", label: "Option Two" },
  { value: "three", label: "Option Three" },
];

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState("one");
    return (
      <div style={{ width: "240px" }}>
        <Dropdown options={sampleOptions} value={value} onChange={setValue} />
      </div>
    );
  },
};

export const Open: Story = {
  render: () => {
    const [value, setValue] = useState("two");
    return (
      <div style={{ width: "240px" }}>
        <Dropdown
          isOpen={true}
          onToggle={() => {}}
          options={sampleOptions}
          value={value}
          onChange={setValue}
        />
      </div>
    );
  },
};

export const WithCustomTrigger: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <div style={{ width: "240px" }}>
        <Dropdown
          isOpen={open}
          onToggle={setOpen}
          trigger={<Button variant="primary">Open Menu</Button>}
        >
          <div style={{ padding: "0.5rem" }}>
            <Button variant="ghost" className="w-full text-left">
              Profile
            </Button>
            <Button variant="ghost" className="w-full text-left">
              Settings
            </Button>
            <Button variant="ghost" className="w-full text-left">
              Logout
            </Button>
          </div>
        </Dropdown>
      </div>
    );
  },
};

export const Closed: Story = {
  render: () => {
    const [value, setValue] = useState("one");
    return (
      <div style={{ width: "240px" }}>
        <Dropdown
          isOpen={false}
          onToggle={() => {}}
          options={sampleOptions}
          value={value}
          onChange={setValue}
        />
      </div>
    );
  },
};

function expectFullyVisible(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  expect(r.top).toBeGreaterThanOrEqual(0);
  expect(r.left).toBeGreaterThanOrEqual(0);
  expect(r.bottom).toBeLessThanOrEqual(window.innerHeight);
  expect(r.right).toBeLessThanOrEqual(window.innerWidth);
  const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  expect(el.contains(hit)).toBe(true);
}

function Menu() {
  return (
    <>
      <DropdownItem>Edit</DropdownItem>
      <DropdownItem>Check connection</DropdownItem>
      <DropdownItem danger>Remove</DropdownItem>
    </>
  );
}

export const InsideClippingContainer: Story = {
  name: "Dropdown inside clipping container",
  render: () => (
    <div style={{ width: 320, height: 56, overflow: "hidden" }} className="rounded-xl border border-line">
      <div style={{ display: "flex", justifyContent: "flex-end", padding: 8 }}>
        <Dropdown
          align="end"
          trigger={<Button variant="secondary">Menu</Button>}
        >
          <Menu />
        </Dropdown>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Menu" }));
    const body = within(document.body);
    const item = await body.findByRole("menuitem", { name: "Remove" });
    expectFullyVisible(item);
    expect(canvasElement.contains(item)).toBe(false);
  },
};

export const FlipsNearViewportBottom: Story = {
  render: () => (
    <div style={{ position: "fixed", left: 24, bottom: 8 }}>
      <Dropdown trigger={<Button variant="secondary">Menu</Button>}>
        <Menu />
      </Dropdown>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("button", { name: "Menu" });
    await userEvent.click(trigger);
    const item = await within(document.body).findByRole("menuitem", { name: "Remove" });
    await waitFor(() => {
      expect(item.parentElement?.dataset.side).toBe("top");
      expect(item.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        trigger.getBoundingClientRect().top,
      );
    });
    expectFullyVisible(item);
  },
};
