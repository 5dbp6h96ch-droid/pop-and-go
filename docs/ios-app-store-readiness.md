# iOS App Store preparation — 2026-10-28

Status: audit in progress; **not** an iOS release candidate. Production `main` remains unchanged.

## Verified architecture
- GitHub Pages frontend using Supabase JS v2.95.0, Leaflet and standalone HTML/JS assets.
- Supabase project `itaoljnqwoiifztjlfyc` with RLS enabled on all 16 public tables and 11 active Edge Functions.
- Current frontend and retrieved Edge Function sources contain no direct Google Apps Script / Google Sheets API integration.
- Browser Web Push is implemented (service workers, PushManager and VAPID); it is **not** native APNs push.
- No confirmed Xcode/Capacitor build, signed bundle or TestFlight delivery.

## Reviewed security evidence
- `popgo-admin`: validates Supabase user token and active admin profile before privileged service-role operations.
- `popgo-push`: requires a secret hook header before delivering notifications.
- `public.send_admin_broadcast`: checks `auth.uid()`, active account and administrator flag.
- `public.webpush_public_key`: returns VAPID **public** key but uses SECURITY DEFINER.
- `public.published_design` view has `security_invoker=false`; confirm intended publicly-readable design configuration and grants before changing.
- Database advisors report six RLS-enabled public tables with no policies; this may be intentional service-only access. Do not add public policies automatically.
- Password leak protection warning, four missing FK indexes, duplicate permissive suggestion policies, one RLS performance warning.

## All Edge Functions examined (read-only)
`popgo-health`, `popgo-admin`, `popgo-web`, `popgo-place-search`, `popgo-site-enrich`, `popgo-website-lookup`, `popgo-design-studio`, `popgo-places-admin`, `popgo-source-extract`, `popgo-geocode-address`, `popgo-push`.

Do not interpret `verify_jwt=false` alone as missing authentication: examine each route's manual token validation. CORS is not a server-side authentication boundary.

## Release blockers and ordered work
1. Confirm backend endpoints' route-specific authorization, URL-fetch SSRF protections, rate limits, and public-view grants with negative tests.
2. Implement account deletion initiated in-app, backed by a privileged, authenticated deletion flow with confirmation, logging, cleanup and cancellation of push subscriptions; test without real member accounts.
3. Establish a standalone iOS Capacitor/Xcode project with reproducible asset bundling. Avoid shipping a plain remote WebView of GitHub Pages.
4. Move GitHub-Pages-root-specific paths (`/pop-and-go/`), iframe URLs, CSP, CORS allowlists and service-worker assumptions behind environment-aware configurations. Keep GitHub Pages production unchanged.
5. Add native APNs push registration and entitlement handling, retaining browser Web Push for PWA; request permission optionally, not as registration prerequisite.
6. Introduce reliable native speech input with a text fallback; provide iOS microphone/speech usage descriptions and test on actual devices.
7. Add privacy policy, support URL, account deletion disclosure, Apple review credentials, native screenshots and App Store metadata.
8. Build, sign, test on iPhone/iPad with Xcode and TestFlight. Only then consider App Store release.

## Rollback and protection
No SQL DDL, production deployment, secrets rotation, auth-setting changes or branch merge under this task. Implement and review changes on isolated branches, validate against test identities, and merge only after explicit verification.
