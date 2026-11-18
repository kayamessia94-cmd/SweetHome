# Sweet Home test shop

Registration, Mobile Money / card payment, admin (seller) page and customer pages.
Backend: Node.js + Express. Data: a simple file (`data/db.json`). Payments: Flutterwave.

## Run it (VS Code terminal, in this folder)

1. Copy your `Image` folder into `public/` (logo and photos).
2. `copy .env.example .env` (Windows) and edit `.env` (set `ADMIN_EMAIL`).
3. `npm install`
4. `npm start`, then open http://localhost:3000

## Try it

- Sign up with the `ADMIN_EMAIL` address: you land on **admin.html** (add products, see orders, change delivery status).
- Sign up with another email: that is a customer. Shop, add to cart, Pay now, then follow the order in **My orders**.
- Without a Flutterwave key, payment uses a simulated Mobile Money screen (test mode).

## Real payments from your phone

1. Create a Flutterwave account, open Settings > API keys (test mode first).
2. Put the secret key in `.env` as `FLW_SECRET_KEY`.
3. Your phone must reach the site: use your PC's Wi-Fi address (`http://192.168.x.x:3000`) or ngrok/Render, and set the same address as `BASE_URL`.
4. Optional but recommended: in Flutterwave > Settings > Webhooks set `BASE_URL/api/flw-webhook` and a secret hash, and put the same hash in `FLW_SECRET_HASH`.

The server checks every payment with Flutterwave before marking an order as paid.
Money goes to your Flutterwave account; withdraw to MTN, Airtel or a bank from its dashboard.

## Files

- `server.js` API, login, products, orders, payments
- `public/` pages: shop, cart, orders (customer), admin, login, signup, pay-test
- `public/site.js` shared header, footer, login state
