# Ecology Tree Service

Marketing website for Ecology Tree Service, Inc. in Mount Kisco, New York.

## Local development

```sh
npm install
npm run dev
```

## Production build

```sh
npm run build
```

The static site is written to `dist/` for deployment to Cloudflare Pages.

The estimate form uses Cloudflare Turnstile and a Pages Worker. For local UI
development, copy `.env.example` to `.env` and supply the public Turnstile site
key. Production reads `PUBLIC_TURNSTILE_SITE_KEY` from a GitHub Actions variable.
The isolated Pages project stores encrypted `TURNSTILE_SECRET` and
`EMAIL_API_TOKEN` values for server-side verification and Cloudflare Email
Service delivery. Its `QUOTE_DB` binding points only to the dedicated D1
database `ecologytreeservice-quotes` (`05341655-f003-4c2c-8fbc-f53df1385691`).
Validated estimate requests are saved there before the email notification is
attempted; each record tracks whether that notification was sent or failed.

## Deployment

Pushes to `main` run `.github/workflows/deploy-cloudflare-pages.yml`, build the
site with Node.js 22, and deploy `dist/` to the isolated Cloudflare Pages project
`ecologytreeservice-site`.

- Production: https://ecologytreeservice.com
- Pages hostname: https://ecologytreeservice-site.pages.dev
- `www` redirects permanently to the apex domain through a zone-scoped
  Cloudflare Redirect Rule.
- The repository secret `CLOUDFLARE_API_TOKEN` has Pages-only write access and
  expires in August 2027.
- The Pages Worker sends estimate notifications through Cloudflare Email
  Service's native REST API to the verified destination
  `ecologytree@gmail.com`.

## Public business details

- Office: (914) 242-9892
- Cell: (914) 760-9892
- Location: Mount Kisco, NY
- Website: https://ecologytreeservice.com
- Forwarding email: info@ecologytreeservice.com

Business details should be rechecked with the owner before changing structured data.
