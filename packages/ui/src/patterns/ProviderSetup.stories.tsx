import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { useState, type ReactNode } from "react";
import { Bot, Brain, Cloud, Gem, Layers, Monitor, Network, Plus, Server, Sparkles, Wind } from "lucide-react";
import { Button } from "../components/Button";
import { Disclosure } from "../components/Disclosure";
import { ExternalLink } from "../components/ExternalLink";
import { FormField } from "../components/FormField";
import { Input } from "../components/Input";
import { OneTimeCode } from "../components/OneTimeCode";
import { RecoveryCard } from "../components/RecoveryCard";
import { SecretInput } from "../components/SecretInput";
import { SettingsGroup, SettingsRow } from "../components/SettingsGroup";
import { StatusDot } from "../components/StatusDot";
import { Step, Steps } from "../components/Steps";

const meta: Meta = {
  title: "Patterns/Provider setup",
  parameters: { layout: "padded" },
  decorators: [(Story) => <div className="mx-auto w-full max-w-xl"><Story /></div>],
};
export default meta;
type Story = StoryObj;

const secretLabels = { showLabel: "Schlüssel anzeigen", hideLabel: "Schlüssel verbergen" };

/** API key form shared by the key-based providers. */
function KeyForm({
  keyUrl,
  stored = false,
  advancedOpen = false,
  baseUrlPlaceholder,
  initialEnv = "",
  envStatus,
}: {
  keyUrl: string;
  stored?: boolean;
  advancedOpen?: boolean;
  baseUrlPlaceholder: string;
  initialEnv?: string;
  envStatus?: "found" | "missing";
}) {
  const [key, setKey] = useState("");
  const [env, setEnv] = useState(initialEnv);
  const looksLikeKey = /^(sk-|sk_|AIza|gsk_|xai-|pk-|or-)/.test(env) || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(env || "X");
  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
      <FormField label="API-Schlüssel" description={env ? "Wird nicht verwendet, solange eine Umgebungsvariable gesetzt ist" : undefined}>
        <SecretInput
          {...secretLabels}
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="sk-…"
          stored={stored}
          disabled={!!env}
          storedLabel="API-Schlüssel hinterlegt"
          replaceLabel="Ersetzen"
        />
      </FormField>
      <div>
        <ExternalLink href={keyUrl}>Schlüssel erstellen</ExternalLink>
      </div>
      <Disclosure label="Erweitert" defaultOpen={advancedOpen}>
        <div className="flex flex-col gap-3">
          <FormField label="Basis-URL">
            <Input placeholder={baseUrlPlaceholder} />
          </FormField>
          <FormField
            label="Name der Umgebungsvariable"
            description="Nur der Name der Variable, nicht der Schlüssel selbst, z. B. ANTHROPIC_API_KEY. Contenox liest den Wert aus der Umgebung der Runtime."
            error={looksLikeKey ? "Das sieht nach einem Schlüssel aus. Trage hier nur den Variablennamen ein oder den Schlüssel selbst ins Feld „API-Schlüssel“ oben." : undefined}
          >
            <Input
              mono
              value={env}
              onChange={(e) => setEnv(e.target.value)}
              placeholder="ANTHROPIC_API_KEY"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              error={looksLikeKey}
            />
          </FormField>
          {envStatus && (
            <StatusDot
              status={envStatus === "found" ? "available" : "attention"}
              label={envStatus === "found" ? "Variable in der Runtime-Umgebung gefunden" : "Variable ist in der Runtime-Umgebung nicht gesetzt. Setze sie und starte Contenox neu."}
            />
          )}
        </div>
      </Disclosure>
      <div className="flex justify-end">
        <Button type="submit">{stored ? "Speichern" : "Verbinden"}</Button>
      </div>
    </form>
  );
}

function ProviderList({
  initial = null,
  advancedOpen = false,
  stored = false,
  anthropicEnv = "",
  envStatus,
}: {
  initial?: string | null;
  anthropicEnv?: string;
  envStatus?: "found" | "missing";
  advancedOpen?: boolean;
  stored?: boolean;
}) {
  const [open, setOpen] = useState<string | null>(initial);
  const row = (id: string, icon: ReactNode, title: string, description: string, body: ReactNode) => (
    <SettingsRow
      key={id}
      icon={icon}
      title={title}
      description={description}
      expanded={open === id}
      onExpandedChange={(e) => setOpen(e ? id : null)}
    >
      {body}
    </SettingsRow>
  );
  return (
    <div className="flex flex-col gap-6">
      <SettingsGroup title="Empfohlen">
        {row(
          "deepseek", <Brain />, "DeepSeek", "DeepSeek-Modelle mit eigenem API-Schlüssel",
          <KeyForm keyUrl="https://platform.deepseek.com/api_keys" baseUrlPlaceholder="https://api.deepseek.com" />,
        )}
        {row(
          "anthropic", <Sparkles />, "Anthropic", "Claude-Modelle mit eigenem API-Schlüssel",
          <KeyForm keyUrl="https://console.anthropic.com/settings/keys" stored={stored} advancedOpen={advancedOpen} baseUrlPlaceholder="https://api.anthropic.com" initialEnv={anthropicEnv} envStatus={envStatus} />,
        )}
        {row(
          "gemini", <Gem />, "Google Gemini", "Gemini-Modelle mit eigenem API-Schlüssel",
          <KeyForm keyUrl="https://aistudio.google.com/app/apikey" baseUrlPlaceholder="https://generativelanguage.googleapis.com" />,
        )}
      </SettingsGroup>
      <SettingsGroup title="Cloud">
        {row("vertex-google", <Cloud />, "Vertex AI", "Google-Modelle über Vertex AI", <div className="flex justify-end"><Button>Verbinden</Button></div>)}
        {row("bedrock", <Layers />, "AWS Bedrock", "Modelle über AWS Bedrock", <div className="flex justify-end"><Button>Verbinden</Button></div>)}
        {row("vllm", <Server />, "vLLM", "Eigener vLLM-Server", <div className="flex justify-end"><Button>Verbinden</Button></div>)}
      </SettingsGroup>
      <SettingsGroup title="Lokal">
        {row(
          "ollama", <Monitor />, "Ollama", "Modelle lokal auf diesem Gerät ausführen",
          <div className="flex justify-end"><Button>Verbinden</Button></div>,
        )}
      </SettingsGroup>
      <Disclosure label="Weitere Anbieter">
        <SettingsGroup>
          {row(
            "openai", <Bot />, "OpenAI", "GPT-Modelle mit eigenem API-Schlüssel",
            <KeyForm keyUrl="https://platform.openai.com/api-keys" baseUrlPlaceholder="https://api.openai.com/v1" />,
          )}
          {row("openrouter", <Network />, "OpenRouter", "Modelle verschiedener Anbieter", <div className="flex justify-end"><Button>Verbinden</Button></div>)}
          {row("mistral", <Wind />, "Mistral", "Mistral-Modelle per API", <div className="flex justify-end"><Button>Verbinden</Button></div>)}
        </SettingsGroup>
      </Disclosure>
    </div>
  );
}

export const AllCollapsed: Story = {
  render: () => <ProviderList />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const anthropic = c.getByRole("button", { name: /Anthropic/ });
    await expect(anthropic).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(anthropic);
    await expect(anthropic).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(c.getByRole("button", { name: /Gemini/ }));
    await expect(anthropic).toHaveAttribute("aria-expanded", "false");
  },
};

export const AnthropicExpanded: Story = {
  render: () => <ProviderList initial="anthropic" />,
};

export const AnthropicAdvancedOpen: Story = {
  render: () => <ProviderList initial="anthropic" advancedOpen />,
};

export const EnvVarLooksLikeKey: Story = {
  render: () => <ProviderList initial="anthropic" advancedOpen anthropicEnv="sk-ant-test123" />,
};

export const EnvVarFound: Story = {
  render: () => <ProviderList initial="anthropic" advancedOpen anthropicEnv="ANTHROPIC_API_KEY" envStatus="found" />,
};

export const EnvVarMissing: Story = {
  render: () => <ProviderList initial="anthropic" advancedOpen anthropicEnv="ANTHROPIC_API_KEY" envStatus="missing" />,
};

export const StoredSecretMode: Story = {
  render: () => <ProviderList initial="anthropic" stored />,
};

export const TwoConnections: Story = {
  render: () => (
    <SettingsGroup title="Lokal">
      <SettingsRow
        icon={<Server />}
        title="Ollama"
        description="2 Verbindungen"
        defaultExpanded
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2">
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-mono text-[13px] text-text">ollama</span>
              <span className="truncate text-xs text-text-muted">http://localhost:11434</span>
            </div>
            <StatusDot status="available" label="Verfügbar" />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2">
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-mono text-[13px] text-text">ollama-2</span>
              <span className="truncate text-xs text-text-muted">http://192.168.1.20:11434</span>
            </div>
            <StatusDot status="unavailable" label="Nicht erreichbar" />
          </div>
          <div>
            <Button variant="text" size="sm"><Plus className="size-3.5" />Weitere Verbindung</Button>
          </div>
        </div>
      </SettingsRow>
    </SettingsGroup>
  ),
};

export const Recovery: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <RecoveryCard
        title="Ollama nicht erreichbar"
        actions={
          <>
            <Button>Erneut prüfen</Button>
            <Button variant="outline">Konfigurieren</Button>
          </>
        }
        details="dial tcp 127.0.0.1:11434: connectex: Es konnte keine Verbindung hergestellt werden, da der Zielcomputer die Verbindung verweigerte."
        detailsLabel="Technische Details"
      >
        Contenox konnte keine Verbindung zu Ollama unter http://localhost:11434 herstellen. Prüfe, ob Ollama läuft.
      </RecoveryCard>
      <RecoveryCard
        tone="warning"
        title="API-Schlüssel ungültig"
        actions={
          <>
            <Button>Schlüssel ersetzen</Button>
            <Button variant="outline">Erneut prüfen</Button>
          </>
        }
        details={'{"error":{"type":"authentication_error","message":"invalid x-api-key"}}'}
        detailsLabel="Technische Details"
      >
        Anthropic hat den hinterlegten Schlüssel abgelehnt. Er wurde möglicherweise widerrufen oder falsch kopiert.
      </RecoveryCard>
      <RecoveryCard
        tone="info"
        title="Anmeldung bei ChatGPT erforderlich"
        actions={<Button>Anmelden</Button>}
      >
        Deine Anmeldung ist abgelaufen. Melde dich erneut an, um ChatGPT weiter zu nutzen.
      </RecoveryCard>
    </div>
  ),
};

export const DeviceCode: Story = {
  render: () => (
    <div className="flex flex-col gap-5 rounded-xl border border-line bg-raised p-5">
      <Steps>
        <Step number={1} title="Im Browser anmelden" done>
          Wir haben die ChatGPT-Anmeldeseite für dich geöffnet.
        </Step>
        <Step number={2} title="Diesen Code eingeben">
          <OneTimeCode value="PLGQ-T2YJJ" copyLabel="Kopieren" copiedLabel="Kopiert" copied />
        </Step>
        <Step number={3} title="Zugriff bestätigen">
          Erlaube Contenox die Nutzung deines ChatGPT-Kontos. Dieses Fenster geht automatisch weiter.
        </Step>
      </Steps>
      <div className="flex items-center justify-between gap-3">
        <StatusDot status="checking" label="Warte auf Bestätigung…" />
        <Button variant="ghost">Abbrechen</Button>
      </div>
    </div>
  ),
};
