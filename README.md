# WZPRO Meta

Next.js 16 app for Warzone loadouts, pro tools, community features, player profiles and Polar-powered paid access.

## Stack

- Next.js 16 app router
- React 19
- TypeScript
- Tailwind CSS 4 via PostCSS
- Supabase auth support
- Polar checkout and webhooks
- Resend email delivery
- Upstash REST storage when configured, local JSON fallback in development

## Local Development

```bash
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:3000`.

PowerShell may block `npm.ps1` on some Windows machines. Use `npm.cmd` for local commands.

## Checks

```bash
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

`npm.cmd test` runs the Node test suite and the public asset reference audit.

## Data Updates

For weapon data, use the scripts in `scripts/` instead of manually editing JSON:

```bash
node scripts/add-weapon.js "<json_object>"
node scripts/update-weapon.js <id> "<json_object>"
```

## Payments

Polar product IDs and webhook secrets are configured through environment variables. Use:

```bash
npm.cmd run setup:polar
```

See `polar.env.example` for required variables.
