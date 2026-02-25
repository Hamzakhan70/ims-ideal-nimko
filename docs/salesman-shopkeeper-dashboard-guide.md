# Salesman and Shopkeeper Dashboard Guide

This guide explains how your current dashboards work, step by step, using your existing code.

## 1. Route and Role Flow

The app first decides where a logged-in user should go based on role:

- `admin` / `superadmin` -> `/admin/dashboard`
- `salesman` -> `/salesman/dashboard`
- `shopkeeper` -> `/shopkeeper/dashboard`

Main routing file:
- `app/src/App.jsx`

Key routes:
- Salesman dashboard: `/salesman/dashboard` -> `SalesmanOrderManagement`
- Shopkeeper dashboard: `/shopkeeper/dashboard` -> `ShopkeeperDashboard`

## 2. Layout and Navigation

Both dashboards are rendered inside `AdminLayout`, which handles:

- Sidebar items by role
- Top header
- Logout
- Notification bell for admin/superadmin

Layout file:
- `app/src/components/admin/AdminLayout.jsx`

## 3. Shopkeeper Dashboard (How It Works)

File:
- `app/src/pages/shopkeeper/ShopkeeperDashboard.jsx`

Flow:

1. On page load, `useEffect` runs:
   - `fetchProducts()`
   - `fetchOrders()`

2. Products are fetched from:
   - `api.products.getAll()`

3. Orders are fetched from:
   - `api.shopkeeperOrders.getAll()`
   - with `Authorization: Bearer <adminToken>`

4. UI sections:
   - Product grid
   - Cart summary
   - Cart table
   - Order history

5. Core actions:
   - `addToCart(product)`
   - `updateQuantity(productId, quantity)`
   - `removeFromCart(productId)`
   - `handlePlaceOrder(e)` to submit order

6. Status colors are handled by:
   - `getStatusColor(status)`

## 4. Salesman Dashboard (How It Works)

File:
- `app/src/pages/salesman/SalesmanOrderManagement.jsx`

Flow:

1. Initial state stores:
   - `orders`
   - `filters` (status/priority/date range)
   - pagination fields

2. Whenever filters change:
   - `useEffect` triggers `fetchOrders()`

3. Orders are fetched from:
   - `api.shopkeeperOrders.getAll()`
   - with `Authorization: Bearer <adminToken>`

4. Filtering and pagination:
   - `filteredOrders` via `useMemo`
   - then sliced into `paginatedOrders`

5. Main actions:
   - `viewOrderDetails(orderId)`
   - `handleStatusUpdate(orderId, newStatus)`

6. UI supports:
   - Mobile card view
   - Desktop table view

## 5. API Path Source

Frontend API paths are centralized in:

- `app/src/utils/api.js`

For these dashboards, mainly:

- `api.products.getAll()`
- `api.shopkeeperOrders.getAll()`
- `api.shopkeeperOrders.getById(id)`
- `api.shopkeeperOrders.updateStatus(id)`
- `api.shopkeeperOrders.create()`

## 6. Backend Endpoints Used

Relevant backend route file:

- `api/routes/shopkeeperOrderRoutes.js`

Important endpoints:

- `POST /api/shopkeeper-orders`
- `GET /api/shopkeeper-orders`
- `GET /api/shopkeeper-orders/:id`
- `PUT /api/shopkeeper-orders/:id/status`

## 7. How to Modify Behavior Safely

If you want to change dashboard behavior, use this order:

1. Confirm route in `App.jsx`
2. Confirm frontend API method in `app/src/utils/api.js`
3. Confirm backend endpoint in `api/routes/shopkeeperOrderRoutes.js`
4. Update UI state and actions in dashboard component
5. Test role login and complete one real flow

## 8. Suggested Next Learning Tasks

1. Add loading skeletons to both dashboards
2. Add shared auth token helper (remove repeated `localStorage.getItem`)
3. Add reusable status badge component
4. Add empty state + retry button for failed API calls
