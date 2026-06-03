# Site Tasks

## Done

- Fix blocking lint errors so the project can be checked reliably.
- Remove unsafe production fallbacks for admin password and JWT secret.
- Centralize public site URL and support email configuration.
- Replace hardcoded payment/preview URLs with configurable URLs.
- Add API-side loadout validation and stat clamping.
- Add a full loadout detail page with shareable URLs.
- Add tests for loadout API validation and admin CRUD.
- Add real subscription entitlement storage instead of access through email token links only.
- Add a payment configuration screen or env validation for Polar product IDs.
- Localize the public copy consistently in French or English.
- Split the large global CSS file into page/component styles.
- Run a live Polar sandbox checkout and webhook delivery test before launch.
- Replace placeholder legal entity fields with the final publisher and hosting details (using Option A - Anonymity for individual publisher).

## Next

- Add route-level tests for Polar checkout, claim, and webhook handling.
- Add visual smoke tests for desktop and mobile layouts.
- Reduce the committed font set to the families actually used by the site.
- Split the remaining large page/content files into typed data modules and smaller components.
