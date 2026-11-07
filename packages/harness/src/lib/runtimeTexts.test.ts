import { beforeAll, describe, expect, it } from 'vitest';
import i18n from '../i18n';
import { translateRoutingLabel, translateRuntimeText } from './runtimeTexts';

beforeAll(async () => {
  await i18n.changeLanguage('de');
});

const t = i18n.t.bind(i18n);

describe('runtimeTexts in the German UI', () => {
  it('translates the routing step labels', () => {
    expect(translateRoutingLabel('Routed to coding', t)).toBe('Weitergeleitet an Coding');
    expect(translateRoutingLabel('Routed to general', t)).toBe('Weitergeleitet an Allgemein');
    expect(translateRoutingLabel('Routed to research', t)).toBe('Weitergeleitet an research');
    expect(translateRoutingLabel('local_fs.write_file: a.txt', t)).toBe(
      'local_fs.write_file: a.txt',
    );
  });

  it('translates the known runtime error texts, even when the summary was cut', () => {
    expect(
      translateRuntimeText(
        'Bedrock model us.anthropic.claude-sonnet-5-5 is not enabled for this AWS account. Enable it under Model access in the Bedrock console, or pick another model.',
        t,
      ),
    ).toContain('us.anthropic.claude-sonnet-5-5 ist für dieses AWS-Konto nicht freigeschaltet');
    expect(
      translateRuntimeText(
        'Bedrock model amazon.x is not enabled for this AWS account. Enable it under Model acc...',
        t,
      ),
    ).toContain('amazon.x ist für dieses AWS-Konto nicht freigeschaltet');
    expect(
      translateRuntimeText(
        "Vertex AI needs Google credentials. Paste a service account key JSON into this connection's settings, or sign in with the Google Cloud CLI: gcloud auth application-default login",
        t,
      ),
    ).toContain('Vertex AI braucht Google-Zugangsdaten');
    expect(translateRuntimeText('Execution failed', t)).toBe('Ausführung fehlgeschlagen');
  });

  it('matches the stable prefix inside a replayed, cut summary and keeps the full remedy', () => {
    const cut =
      'prompt refused by every capable backend: backend bedrock:us-east-1 (model us.anthropic.claude-sonnet-5-5): Bedrock model us.anthropic.claude-sonnet-5-5 is not enabled for this AWS account. Enable it under Model access i…';
    const out = translateRuntimeText(cut, t);
    expect(out).toContain(
      'us.anthropic.claude-sonnet-5-5 ist für dieses AWS-Konto nicht freigeschaltet',
    );
    expect(out).toContain('Model access');
    expect(out).not.toContain('prompt refused');
    expect(
      translateRuntimeText(
        'backend vertex: Vertex AI needs Google credentials. Paste a service acc…',
        t,
      ),
    ).toContain('Vertex AI braucht Google-Zugangsdaten');
  });

  it('translates the approval notes a withdrawn permission card leaves on its step', () => {
    expect(translateRuntimeText('Approved by Oracle: part of your request', t)).toBe(
      'Vom Oracle freigegeben: Teil deiner Anfrage',
    );
    expect(translateRuntimeText('Approved from the Inbox', t)).toBe('Aus dem Eingang freigegeben');
    expect(translateRuntimeText('No answer before the deadline', t)).toBe(
      'Keine Antwort vor der Frist',
    );
  });

  it('leaves unknown texts as they are', () => {
    expect(translateRuntimeText('something else broke', t)).toBe('something else broke');
  });
});
