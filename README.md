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
Cloudflare Pages Function /api/iqd requests https://mxdollar.pages.dev/api/market and selects the **highest BUY**, among Kifah, Harithiya, and Kukh, as USD→IQD. The site returns IQD per **one USD**, dividing the full IQD price for $100 by 100. Normalizes MXDollar values shown as 164, 1,640 or 164,000 per 100 USD to the same 164,000 IQD/$100. No central-bank rate is substituted.

Other prices are loaded from the continuously refreshed iOS MX Currency project's rates.json at mazenmix/MX-Currency- and cached locally for offline use. The app doesn't fabricate prices when a source is unavailable.
