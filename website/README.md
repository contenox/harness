# contenox.com

Static site for contenox.com, built with Astro. The site owns no content:
every page under `/docs/` renders markdown from this repo's `docs/` tree
(see `src/content.config.ts`). Editing a doc there is editing the website.

```bash
make deps-website      # npm ci
make dev-website       # local dev server with live reload
make build-website     # static output -> website/dist
make preview-website   # build + serve the built output
```

`docs/` is the site's whole content source: `guide/`, `specification/`,
`integrations/`, `reference/`, and `use-cases/` publish today; `development/`
(contributor docs and, under `development/blueprints/`, design records) is also
published but kept out of the SEO/sitemap surface. Internal working notes never
live in `docs/` — they go to the gitignored `.notes/` at the repo root.

Conventions:

- Frontmatter (`title`, `description`) is optional; pages without it fall back
  to their first heading. Set `draft: true` to keep a doc out of the build.
- `public/` is served at the site root; `public/install.sh` must stay
  URL-stable (`https://contenox.com/install.sh` is referenced by docs and the
  install instructions).
- Deployment (CI push of `dist/` to a GitHub Pages repo) is not wired yet;
  builds are local-only.


## Content-addressed media

Large product media never enters this repository. It lives in the website asset
bucket as immutable, content-addressed objects; only URL-stable identity files
(favicons, icons, logos, the Open Graph image) stay under `public/`.

Publish a reviewed capture and update the tracked manifest:

```bash
python3 tools/publish-showcase.py --poster /tmp/contenox-harness-workbench-poster.webp
# optional film:
python3 tools/publish-showcase.py --poster poster.webp --webm film.webm --mp4 film.mp4
```

The publisher hashes the bytes, uploads with `Cache-Control: immutable` and
`If-None-Match: *`, reads the object back, verifies the bytes, and only then
rewrites `src/data/showcase.json`. `Landing.astro` reads that manifest; when it
contains video sources the product stage renders a `<video>`, otherwise the
poster image.
