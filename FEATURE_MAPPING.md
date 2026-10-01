# Chromium source mapping

This revision follows current Chromium top-chrome source structure:
- `chrome/browser/ui/views/tabs/` — tab geometry, tab strip, tab actions and tab styling.
- `chrome/browser/ui/views/toolbar/toolbar_view.cc` — toolbar control grouping and command placement.
- `chrome/browser/resources/webui_toolbar/` — Chromium's WebUI toolbar experiment.
- `chrome/browser/resources/tab_search/` — tab-search UI.
- `chrome/browser/resources/downloads/` — downloads UI.
- `chrome/browser/resources/extensions/` — extensions UI.
- `chrome/app/vector_icons/` — Chromium's 24px vector-icon vocabulary and geometry.

The IWA cannot embed privileged `chrome://` browser pages or the native C++ Views toolbar. Those surfaces are reproduced in the IWA DOM; website content is rendered through Controlled Frame.
