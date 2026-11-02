# iOS build (isolated)
This is an **unsigned build prototype**, not a shipping app. The production GitHub Pages site is unchanged.

Requires macOS/Xcode 26+, Node and npm. Use the free macOS build minutes in a personal Codemagic account or GitHub Actions for public repositories. Apple signing and TestFlight require a developer team.

1. From `ios-app/`, run `npm install` and `npm run ios:init` (first time).
2. Subsequent updates: `npm run ios:sync`.
3. Open `ios/App/App.xcodeproj` or the generated workspace in Xcode and build for an iOS simulator without signing.
4. Commit a generated `package-lock.json` after verifying dependency resolution, then change CI to `npm ci`.

`scripts/prepare-web.mjs` copies tracked static frontend resources to `www/` and changes GitHub Pages root paths to native root paths. It deliberately does not deploy or modify any backend. Test iframe navigation, auth redirect URLs, service workers and push behavior in a simulator. Browser Web Push is **not** native APNs push. Do not ship before those gaps, account deletion and Apple privacy requirements are resolved.

The bundle identifier `de.rausundguggen.app` is provisional and must be checked for availability before registering it in Apple Developer.
