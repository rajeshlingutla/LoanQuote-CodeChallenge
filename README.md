# loan quote

React UI, Express 5 BFF (GraphQL), Express mock (REST).

You put in amount, term (months), and risk band. Commission rate is per year, so the mock/BFF convert months to years for the total.

Used plan mode from Claude.

## run

Node 20+ and npm.

```bash
npm install
npm run dev
```

Open http://localhost:5173

- web: 5173
- bff: 3000
- mock: 4000

`/api` on the UI is proxied to the BFF. The UI calls GraphQL at `/api/graphql`. Don't call the mock from the browser.

One-off:

```bash
npm run dev:mock
npm run dev:bff
npm run dev:web
```

Mock first, then BFF, then web.

## tests

```bash
npm test
```

Jest + RTL on the frontend, ts-jest on the BFF/mock.
