# IMS Mobile App (React Native + Expo)

This folder contains the mobile app for two roles:
- `salesman`
- `shopkeeper`

## 1. Prerequisites

- Node.js 20+ (LTS recommended)
- npm
- Android Studio emulator or a physical Android phone
- Expo Go app on your phone (from Play Store)

## 2. Environment Setup

Create a local env file:

```bash
cp .env.example .env
```

Set API URL in `.env`:

```env
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:5000/api
```

Important:
- Do not use `localhost` on a real phone.
- Use your computer LAN IP (example: `192.168.1.50`).
- Phone and laptop must be on same Wi-Fi.

## 3. Install and Run

```bash
npm install
npm run start
```

Then:
- Press `a` to open Android emulator, or
- Scan QR code in Expo Go using your phone.

## 4. Project Structure

```text
mobile/
  src/
    components/
      common/          # reusable UI (buttons, inputs, cards, states)
      orders/          # order-specific UI
    constants/         # routes, roles, statuses, app config
    context/           # auth/session context
    navigation/        # role-based navigators
    screens/
      auth/
      salesman/
      shopkeeper/
      common/
    services/
      api/             # axios client + endpoints
      auth/            # async-storage helpers
    theme/             # colors + spacing tokens
    utils/             # currency/date/error helpers
```

## 5. Current Feature Scope

- Role-based login
- Salesman dashboard (overview + quick actions + status progression)
- Salesman place order flow for assigned shopkeepers (with payment + custom price support)
- Salesman recovery board (record recovery, items support, live pending summary, recent list)
- Native receipt printing for salesman order and recovery flows
- Shopkeeper dashboard (view own orders)
- Shopkeeper place-order flow
- Token persistence using AsyncStorage

## 6. Next Recommended Steps

- Add TypeScript (`.tsx`) for safer scaling
- Add unit tests for utils and auth context
- Add order details screen
- Add payment update screen for salesman
- Add EAS build pipeline for Play Store deployment
