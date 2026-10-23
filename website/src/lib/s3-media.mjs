// Docs media is served from the website asset bucket; only URL-stable identity
// files (favicons, icons, logos, OpenGraph) live under public/.
export const S3_MEDIA_BASE =
  'https://contenox-website-assets-573643652148.s3.amazonaws.com/media/';

export const S3_MEDIA = new Set([
  'agent-check.gif',
  'agent-permission-card.png',
  'agent-picker.png',
  'agent-slash-menu.png',
  'aionui-custom-agent.png',
  'backend-manager-demo.mp4',
  'beam-agent-view.png',
  'beam-demo.webm',
  'beam-login.png',
  'beam-new-chat.png',
  'beam-video-cover.png',
  'chain-blocked.gif',
  'chain-runner-demo.webm',
  'chain_flow_diagram.png',
  'hero.gif',
  'hitl-approve.gif',
  'hooks_architecture.png',
  'lab-admin-bob-apps.png',
  'lab-admin-bob-tenants.png',
  'lab-admin-bob-tenants2.png',
  'lab-admin-bob-worker-pools.png',
  'lab-beam-desktop-shell.png',
  'lab-beam-session.png',
  'lab-blueprints-ticket-triage-form.png',
  'lab-blueprints-ticket-triage.png',
  'lab-bob-beam.png',
  'lab-bob-connectors.png',
  'lab-bob-dashboard.png',
  'lab-bob-files.png',
  'lab-bob-members.png',
  'lab-bob-search.png',
  'lab-hosted-account-files.png',
  'lab-hosted-mention.png',
  'lab-hosted-team-session.png',
  'lab-hosted-tool-calls.png',
  'lab-mailpit-inbox.png',
  'lab-minio-console.png',
  'lab-mvp-selfreview.jpg',
  'lab-site-admin-login.png',
  'lab-site-bob-signup.png',
  'lab-site-home.png',
  'vscode-extension-icon.png',
]);

const MEDIA_ATTR = /((?:src|poster|href)=")\/([^"/][^"]*)"/g;

export function rewriteMediaUrls(html) {
  return html.replace(MEDIA_ATTR, (match, prefix, name) =>
    S3_MEDIA.has(name) ? `${prefix}${S3_MEDIA_BASE}${name}"` : match,
  );
}
