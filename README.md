# MX Currency • MazenmiX
Responsive web port designed to match the supplied iPhone screenshot (black canvas, iOS-style 0 = 0 conversion, square calculator cells, white star, top-right chart, red Clear, white Backspace, and green Switch).
Works on iPhone, Android, desktop, and can be installed as a PWA.

## Deploy to Cloudflare Pages
Connect the GitHub repository mazenmix/currency to a new Cloudflare Pages project. Use:
- Framework preset: None
- Build command: leave empty
- Build output directory: .
- Production branch: main
- Functions: root functions/api/ is auto-discovered by Cloudflare Pages Git integration.

Deployment URL will be assigned by Cloudflare Pages. Creating a GitHub repository alone does not create a live pages.dev URL.

## IQD / Iraqi market
Cloudflare Pages Function `/api/iqd` gets the latest **Kifah SELL** price directly from `https://iraqsm.com/data/fx.json` (IQWealth). It uses `parallel.sell` in IQD per 1 USD, preserves `parallel.publishedAt` and `parallel.stale`, and returns 503 if that source is not available. It never falls back to MXDollar, Telegram, the official CBI rate, or a guessed price. The UI shows the original publication time in Baghdad and attributes the USD/IQD quote to IQWealth. The source is refreshed by the site periodically; IQWealth publishes market readings several times each day, not tick-by-tick.

Other international currency cross rates continue to use the existing global rate book. The "IQWealth only" constraint applies to the Baghdad USD/IQD quote. See IQWealth's usage conditions for public/commercial deployments.

Other prices are loaded from the continuously refreshed iOS MX Currency project's rates.json at mazenmix/MX-Currency- and cached locally for offline use. The app doesn't fabricate prices when a source is unavailable.
