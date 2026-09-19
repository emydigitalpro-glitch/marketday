 # Marketday

 Marketday is a local buyer and seller marketplace for mobile and desktop web.

 ## Run locally

 Install dependencies once:

 ```bash
 npm install
 ```

 Start the API in one terminal:

 ```bash
 npm run api
 ```

For Paystack checkout, set your test secret key before starting the API:

```powershell
$env:PAYSTACK_SECRET_KEY="sk_test_your_key_here"
$env:PAYSTACK_CALLBACK_URL="http://127.0.0.1:5173/?payment=callback"
npm run api
```

Seller accounts are stored in `data/db.json` with a `pending` approval status. New seller applications must provide a shop name, payout details, and a valid account number. They cannot publish listings or receive checkout traffic until an administrator approves them. Set an admin approval key and approve an application with:

```powershell
$env:ADMIN_APPROVAL_KEY="replace_with_a_long_random_value"
Invoke-RestMethod -Method Post -Uri "http://localhost:8787/api/admin/sellers/SELLER_ID/approve" -Headers @{ "X-Admin-Key" = $env:ADMIN_APPROVAL_KEY }
```

The seller ID is returned when the application is created and is also stored in `data/db.json`. Keep the admin key server-side.

Copy `.env.example` as a reference. The secret key stays on the backend. Sellers choose `I am selling` during signup, then add withdrawal details from `Settings` after their account is created. Paystack creates the seller subaccount only from that authenticated settings action. Checkout redirects to Paystack, sends the seller share to that subaccount, and verifies the transaction before creating the paid order and reducing stock. `MARKETPLACE_COMMISSION_PERCENT` controls the platform commission.

For production, configure Paystack's webhook URL as `https://your-domain.com/api/payments/webhook`. The webhook is signature-checked with the same secret key.

 Start the frontend in another terminal:

 ```bash
 npm run dev
 ```

 Open `http://127.0.0.1:5173/`.

 The API stores local development data in `data/db.json`, hashes passwords with Node's `scrypt`, validates seller permissions, and performs server-side stock checks at checkout. The browser keeps the cart locally so a guest can shop before signing in.

 Useful checks:

 ```bash
 npm run build
 npm run lint
 ```
