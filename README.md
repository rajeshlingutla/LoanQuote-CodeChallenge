# loan quote

React UI, Express 5 BFF (GraphQL), Express mock (REST).

You put in amount, term (months), and risk band. Commission rate is per year, so the mock/BFF convert months to years for the total.

## run

Node 20+ and npm.

1. Install dependencies from the repo root (`npm install`). Workspaces put `node_modules` at the root and in each package. Run this after a clone, and again if you delete `node_modules`.
2. Start the stack (`npm run dev`).

```bash
npm install
npm run dev
```

Open http://localhost:5173

- web: 5173
- bff: 3000
- mock: 4000

`/api` on the UI is proxied to the BFF. The UI calls GraphQL at `/api/graphql`. Don't call the mock from the browser.

One-off (after `npm install`):

```bash
npm run dev:mock
npm run dev:bff
npm run dev:web
```

Mock first, then BFF, then web.

## tests

After `npm install`:

```bash
npm test
```

Jest + RTL on the frontend, ts-jest on the BFF/mock.

## authentication

Locally the BFF authenticates GraphQL callers with a static shared secret in `x-api-key` (`API_KEY` / `VITE_API_KEY`). That is a stand-in only: the credential is long-lived, not audience-bound, and cannot express least-privilege permissions.

For production API security the BFF would be a confidential OAuth 2.0 client using the **client credentials** grant (`grant_type=client_credentials`, RFC 6749 §4.4). It would authenticate to the authorization server token endpoint with its registered `client_id` and `client_secret`, and request an access token whose `scope` is limited to the operations this client is allowed to perform. The GraphQL `createQuote` mutation would require `quotes:create`. Additional scopes would be registered separately if other operations were added; the client would not be issued unused scopes.

Callers would send `Authorization: Bearer <access_token>` instead of `x-api-key`. The BFF would validate the token (issuer, audience, expiry, signature or introspection) and reject the request unless the token’s `client_id` is an allowed client and the granted scopes include `quotes:create`. The mock commission service would remain a private downstream dependency of the BFF, not a public OAuth resource.
