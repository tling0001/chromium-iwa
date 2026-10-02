# Chromium IWA

A Chromium-style Isolated Web App browser shell built from the Khan IWA window architecture, with a borderless/unframed top chrome, Chromium-inspired WebUI toolbar surfaces, and website rendering through Controlled Frame.

## What is implemented

The shell intentionally follows current Chromium source concepts rather than a generic browser mockup:

- `kWebUIToolbar` / `kWebUILocationBar` / WebUI toolbar controls represented as local Web Components/DOM controls.
- Current Chromium Toolbar Glow Up concepts: rounded toolbar controls, animated/reload-aware controls, bookmark control, profile/menu controls.
- Current `webui-refresh-2026` / Desktop Glow Up styling direction for the shell surfaces.
- Current App Menu Glow Up direction: compact action cards plus a complete everyday browser menu.
- Chromium-like tab geometry based on `TabStyle`/`TabStyleViews`: active/inactive tabs, overlap/separators, pinned tabs, drag reorder, close buttons, context menus, and tab search.
- Omnibox suggestions from bookmarks/history plus URL/search handling and keyboard selection.
- Page-info/security bubble, permission prompts, download permission prompts, bookmark UI, history, downloads, extensions surface, settings surface, find, print, QR surface, and common shortcuts.
- Persistent Controlled Frame browsing partition for normal windows; a separate non-persistent Controlled Frame partition for the Incognito shell.
- New-window requests are converted into tabs when the Controlled Frame API exposes the requested guest window.
- Khan-IWA window controls geometry: the **32px drag-square** and **44px × 32px close button** treatment are retained; the drag-square contains a maximize/restore icon instead of the Khan grip icon.

## Important IWA limitation

The real `chrome://webui-toolbar.top-chrome/` surface is privileged Chromium browser UI and cannot simply be embedded into an IWA. This project therefore reproduces the current WebUI toolbar layout/behavior in the IWA's own bundled DOM while using Controlled Frame for untrusted web content.

Likewise, the standard IWA web platform does not currently expose a portable API equivalent to Chrome's native browser-window maximize/minimize methods. The maximize/restore control therefore attempts the legacy `window.resizeTo()`/`window.moveTo()` path when the runtime permits it, while the drag region remains the same Khan-IWA style. On runtimes that block those operations, the control cannot force the OS window state from JavaScript.

## Build locally

Node 22.13+ is required by the current `wbn-sign` package.

```bash
npm install
npm run generate-key   # once; keep chromium_private_key.pem forever
npm run build
```

The build runs the Node versions of the Web Bundle tools:

```bash
npx wbn --dir src -o unsigned.wbn
npx wbn-sign sign unsigned.wbn chromium_private_key.pem -o chromium.swbn
```

The `package.json` version is copied into `src/.well-known/manifest.webmanifest`, and `update_manifest.json` is generated from that same version. On GitHub Actions, `GITHUB_REPOSITORY` supplies the repository portion of the update URL.

## GitHub Actions releases

`.github/workflows/build-iwa.yml` builds on every push. Pushes to the repository's default branch also create/update a release whose tag is `v<package.json version>` and upload `chromium.swbn` plus `update_manifest.json`.

### Signing key — important

**Do not generate a new signing key for every release.** An IWA's identity is tied to its signing key. Changing the key makes the signed bundle a different IWA and breaks seamless updates. Generate one Ed25519 key once and store its complete PEM text in the GitHub repository secret named `IWA_PRIVATE_KEY`. The workflow restores that same key for every build.

The official IWA documentation explicitly states that signing-key identity affects updates, and the current `wbn-sign` package supports Ed25519 keys and Node 22.13+.

## Current Chromium references

The implementation was based on the current Chromium source concepts for:

- `chrome/common/chrome_features.cc` — WebUI toolbar/location-bar feature gates.
- `chrome/browser/ui/ui_features.cc/.h` — Toolbar Glow Up, WebUI Refresh 2026, App Menu Glow Up and WebUI toolbar helpers.
- `chrome/browser/ui/views/tabs/tab_style*` — tab sizing, overlap and geometry.
- `chrome/browser/ui/webui/webui_toolbar/` — the current WebUI toolbar architecture.
- `chrome/browser/resources/downloads/`, `bookmarks/`, `settings/` — WebUI surface styling direction.
- `chrome/app/vector_icons/` — Chromium vector-icon vocabulary.

See `FEATURE_MAPPING.md` for the mapping from Chromium features to the IWA implementation.


### v4 fixes
- Icons use an inline SVG sprite so IWA rendering does not depend on external SVG `<use>` references.
- Window close control follows the Khan IWA control implementation and explicitly uses a no-drag region.
- Maximize/restore control uses the same 32px Khan drag-square geometry.
