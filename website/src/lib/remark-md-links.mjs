import { visit } from 'unist-util-visit';
import path from 'node:path';

// Root-relative docs media lives in the website asset bucket, never in the
// repository (only URL-stable identity files stay under public/).
const S3_MEDIA_BASE = 'https://contenox-website-assets-573643652148.s3.amazonaws.com/media/';
const S3_MEDIA = new Set([
  'agent-check.gif',
  'agent-permission-card.png',
  'agent-picker.png',
  'agent-slash-menu.png',
  'beam-agent-view.png',
  'beam-demo.webm',
  'beam-login.png',
  'beam-new-chat.png',
  'beam-video-cover.png',
  'hooks_architecture.png',
  'lab-admin-bob-apps.png',
  'lab-admin-bob-tenants.png',
  'lab-admin-bob-tenants2.png',
  'lab-admin-bob-worker-pools.png',
  'lab-beam-desktop-shell.png',
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

// Rewrites relative links in content:
//  - `*.md` links become their rendered routes. A file at docs/a/b.md renders
//    at /docs/a/b/ (one extra path segment), so a file-relative link needs one
//    leading `../` to stay correct from the page URL. Path segments are
//    lowercased to match the glob loader's slugs (README.md -> readme/).
//  - other relative links (source files, configs) cannot exist on the static
//    site; they are rewritten to GitHub blob URLs resolved against the source
//    markdown file's repo path.
export default function remarkMdLinks() {
  return (tree, file) => {
    const abs = file?.history?.[0] ?? '';
    const marker = `${path.sep}docs${path.sep}`;
    const idx = abs.lastIndexOf(marker);
    const repoDir = idx === -1 ? null : path.posix.dirname('docs/' + abs.slice(idx + marker.length).split(path.sep).join('/'));

    visit(tree, 'image', (node) => {
      const url = node.url ?? '';
      if (url.startsWith('/') && S3_MEDIA.has(url.slice(1))) node.url = S3_MEDIA_BASE + url.slice(1);
    });

    visit(tree, 'html', (node) => {
      node.value = node.value.replace(/((?:src|poster)=")\/([^"/][^"]*)"/g, (match, prefix, name) =>
        S3_MEDIA.has(name) ? `${prefix}${S3_MEDIA_BASE}${name}"` : match);
    });

    visit(tree, 'link', (node) => {
      const url = node.url ?? '';
      if (/^(https?:)?\/\//.test(url) || url.startsWith('/') || url.startsWith('#') || url.startsWith('mailto:')) return;
      if (/\.md(#|$)/.test(url)) {
        const [p, anchor] = url.split('#');
        node.url = '../' + p.toLowerCase().replace(/\.md$/, '/') + (anchor ? `#${anchor}` : '');
        return;
      }
      if (repoDir) {
        const resolved = path.posix.normalize(path.posix.join(repoDir, url));
        if (!resolved.startsWith('..')) {
          node.url = `https://github.com/contenox/harness/blob/main/${resolved}`;
        } else {
          // Climbs out of docs/ — a repo source path like ../../runtime/foo.go.
          const fromRepoRoot = path.posix.normalize(path.posix.join(repoDir.replace(/^docs/, ''), url)).replace(/^\/+/, '');
          node.url = `https://github.com/contenox/harness/blob/main/${fromRepoRoot}`;
        }
      }
    });
  };
}
