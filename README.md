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
key. Production reads `PUBLIC_TURNSTILE_SITE_KEY` from a GitHub Actions variable
and `TURNSTILE_SECRET` from the isolated Pages project's encrypted secrets.

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
- The Pages `QUOTE_EMAIL` Send Email binding delivers estimate requests to the
  verified destination `ecologytree@gmail.com`.

## Public business details

- Phone: (914) 242-9892
- Address: 215 Croton Lake Road, Mount Kisco, NY 10549
- Website: https://ecologytreeservice.com
- Forwarding email: info@ecologytreeservice.com

Business details should be rechecked with the owner before changing structured data.
