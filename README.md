# Chromium IWA v1.1

A Chromium-style borderless IWA based on the supplied Khan IWA foundation.

Includes:
- much closer Chromium tab-strip and toolbar geometry
- Chromium-style vector icon SVGs
- omnibox suggestions from history/bookmarks/search
- tab context menus
- bookmarks and bookmark bubble
- downloads surface
- permission bubbles
- page security/info bubble
- extensions surface
- tab search
- expanded Chrome menu
- history, find, print, save-page shell, QR shell, settings, profile
- persistent Controlled Frame partition
- everyday Chromium keyboard shortcuts

Privileged Chrome surfaces cannot be directly embedded by an IWA; the shell recreates their visible UI while Controlled Frame renders web content.
