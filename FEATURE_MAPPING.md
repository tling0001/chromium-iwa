# Chromium feature mapping

This file records which current Chromium desktop concepts are reproduced in the IWA shell.

| Chromium source concept | IWA implementation |
|---|---|
| `features::kWebUIToolbar` | Local top-chrome toolbar composed from bundled DOM controls. |
| `features::kWebUILocationBar` | Chromium-style rounded omnibox with history/bookmark/search suggestions and keyboard selection. |
| `features::kWebUIReloadButton` | Controlled Frame reload control with loading state. |
| `IsWebUIBackForwardButtonEnabled()` | Controlled Frame back/forward controls. |
| `IsWebUIHomeButtonEnabled()` | Home navigation control. |
| `IsWebUIPinnedToolbarActionsEnabled()` | Bookmark/star plus dedicated Downloads/Extensions/profile/menu actions. |
| `IsWebUIExtensionsContainerEnabled()` | Extensions toolbar surface. |
| `IsWebUIToolbarFullyEnabled()` | The shell keeps the WebUI-style toolbar controls together as one top-chrome surface. |
| `kToolbarGlowUp` | Rounded control hit targets, toolbar spacing, bookmark/reload/back-forward treatment. |
| `kWebuiRefresh2026` | Dark Material/Google Sans-style surface treatment used by the shell's menus/modals. |
| `kAppMenuGlowUp` | Card-based Chrome menu header/actions plus the full everyday menu. |
| `kMenuSimplification` | Compact grouped actions in the main menu while retaining everyday commands. |
| `TabStyle::GetStandardWidth()` | 240px maximum standard tab target, with responsive shrinking. |
| `TabStyle::GetPinnedWidth()` | Compact 48px pinned-tab presentation. |
| Tab overlap/separators | CSS tab separators and active/inactive geometry. |
| Tab search | Search Tabs modal with keyboard shortcut `Ctrl+Shift+A`. |
| Tab context menu | Reload, duplicate, pin, mute state, move, close, close others, reopen. |
| Chromium vector icons | Bundled SVG symbol set in `src/assets/icons.svg`, following Chromium icon vocabulary and 24px geometry. |
| WebUI downloads | Local Downloads surface plus Controlled Frame download permission prompts. |
| WebUI bookmarks | Bookmarks and lists modal plus omnibox bookmark suggestions. |
| WebUI page-info/security | Site security bubble and site-settings entrypoint. |
| WebUI permissions | In-app permission bubbles for Controlled Frame permission requests. |
| WebUI extensions | Extensions surface and toolbar button. |
| Borderless/unframed IWA | Manifest `display_override` uses `unframed` then `borderless`. |
| Controlled Frame | One Controlled Frame per browser tab, with persistent normal browsing partition. |

## Deliberate IWA substitutions

The privileged native `chrome://webui-toolbar.top-chrome/` renderer, C++ Views, native browser command routing, native download manager, extension service, and native OS window-state APIs are not directly exposed to an IWA. The project reproduces their user-facing surfaces where web APIs permit and uses Controlled Frame for the actual web page.
