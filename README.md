# USS Project Pages

Static site wrapper for the bundled USS Project pages.

## View locally

Serve the repository root with any static file server, then open the printed URL in a browser.

```bash
python3 -m http.server 4173
```

Routes are hash based so the site works from static hosts and preview environments without server-side rewrite rules:

- `/#chat`
- `/#history`

## Site entry point

Use `index.html` as the site entry point. The bundled pages live under `pages/` and are loaded into the wrapper iframe with relative URLs so they work both at a domain root and under a preview subpath.

## Feedback widget

Every page shows a floating **💬 Feedback** button. Pinned comments become GitHub issues that Claude fixes automatically via a PR. Setup and details: [FEEDBACK-SETUP.md](FEEDBACK-SETUP.md).
