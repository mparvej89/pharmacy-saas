# API Specification: Pharmacy SaaS REST API (`/api/v1`)

All endpoints are versioned under `/api/v1`. Authentication is verified via `Authorization: Bearer <JWT_TOKEN>`. Tenant context is enforced by the server from the token and user membership.

## 1. Authentication & Tenant Session (`/api/v1/auth`)

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/auth/login` | POST | Public | Authenticates user; returns JWT & store memberships |
| `/auth/me` | GET | Authenticated | Returns current profile, active store, and permissions |
| `/auth/select-store` | POST | Authenticated | Switch active working store for the session |
| `/auth/refresh` | POST | Authenticated | Refresh JWT access token |
| `/auth/logout` | POST | Authenticated | Invalidate current session |

## 2. Store & User Administration (`/api/v1/stores`, `/api/v1/users`)

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/stores` | GET | Super Admin | List all tenant stores |
| `/stores` | POST | Super Admin | Onboard a new pharmacy tenant store |
| `/stores/:id` | GET | Store Owner / Pharmacist | Get store profile (GSTIN, DL number, address) |
| `/stores/:id` | PUT | Store Owner | Update store details and tax parameters |
| `/users` | GET | Store Owner | List staff users in current store |
| `/users` | POST | Store Owner | Invite/create staff member with assigned role |
| `/users/:id/role` | PUT | Store Owner | Update staff permissions/role |

## 3. Medicine Catalogue (`/api/v1/medicines`)

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/medicines` | GET | Any Store Staff | Search & paginate medicines (by name, generic, barcode) |
| `/medicines/:id` | GET | Any Store Staff | Get medicine details with batch inventory snapshot |
| `/medicines` | POST | Owner / Pharmacist / Inventory | Create new medicine with HSN code, GST rate & schedule |
| `/medicines/:id` | PUT | Owner / Pharmacist / Inventory | Update medicine catalogue entry |
| `/medicines/:id/status` | PATCH | Owner / Pharmacist | Toggle active/inactive status |
| `/medicines/check-duplicate` | POST | Any Store Staff | Validate against existing names/SKU/barcode |

## 4. Suppliers (`/api/v1/suppliers`)

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/suppliers` | GET | Any Store Staff | List suppliers with outstanding balance summary |
| `/suppliers/:id` | GET | Any Store Staff | Get supplier details & purchase history |
| `/suppliers` | POST | Owner / Inventory | Register new supplier with GSTIN & DL info |
| `/suppliers/:id` | PUT | Owner / Inventory | Update supplier info |
| `/suppliers/:id/ledger` | GET | Owner / Inventory | View supplier purchase & payment ledger |

## 5. Purchases & Goods Receipt (`/api/v1/purchases`)

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/purchases` | GET | Owner / Pharmacist / Inventory | List purchases (status: DRAFT / POSTED) |
| `/purchases/:id` | GET | Owner / Pharmacist / Inventory | View purchase details & itemized batches |
| `/purchases` | POST | Owner / Inventory | Create draft purchase invoice with free quantities |
| `/purchases/:id` | PUT | Owner / Inventory | Update draft purchase items |
| `/purchases/:id/post` | POST | Owner / Pharmacist / Inventory | Atomically post purchase: creates batches & stock ledger |
| `/purchases/:id/cancel` | POST | Owner | Cancel draft purchase |

## 6. Batch Inventory & FEFO Engine (`/api/v1/inventory`)

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/inventory/batches` | GET | Any Store Staff | View stock by batch, expiry date, status & rack |
| `/inventory/fefo-candidate/:medicineId` | GET | Any Store Staff | Fetch earliest unexpired sellable batch for medicine |
| `/inventory/low-stock` | GET | Any Store Staff | List medicines below reorder level |
| `/inventory/expiring` | GET | Any Store Staff | List batches expiring within 30/60/90 days or expired |
| `/inventory/adjustments` | GET | Owner / Pharmacist | View stock adjustment log |
| `/inventory/adjustments` | POST | Owner / Pharmacist | Create physical count variance or damage adjustment |
| `/inventory/ledger` | GET | Owner / Pharmacist | Filter immutable stock ledger movements |

## 7. POS Billing & Invoicing (`/api/v1/sales`)

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/sales` | GET | Any Store Staff | List sales invoices with filters (date, cashier, status) |
| `/sales/:id` | GET | Any Store Staff | View complete invoice details, GST breakup & items |
| `/sales` | POST | Cashier / Pharmacist / Owner | Atomically checkout sale: locks stock, FEFO, creates GST bill |
| `/sales/:id/reprint` | GET | Any Store Staff | Generate printable receipt payload |
| `/sales/:id/payments` | POST | Cashier / Owner | Record split or pending balance payment |

## 8. Returns & Quarantine Inspection (`/api/v1/returns`)

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/returns` | GET | Any Store Staff | List sale returns |
| `/returns/:id` | GET | Any Store Staff | View return details and inspection status |
| `/returns` | POST | Pharmacist / Owner | Process customer return (places stock into quarantine) |
| `/returns/:id/inspect` | POST | Pharmacist / Owner | Inspect quarantined returned stock; move to available/damaged |

## 9. Reports & Analytics (`/api/v1/reports`)

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/reports/dashboard` | GET | Any Store Staff | Today's sales, count, low stock, expiring, stock valuation |
| `/reports/sales-summary` | GET | Owner / Pharmacist | Aggregated daily, weekly, monthly sales breakdown |
| `/reports/sales-by-medicine`| GET | Owner / Pharmacist | Top selling medicines, profit margins, volume |
| `/reports/sales-by-cashier` | GET | Owner | Cashier register performance & collections |
| `/reports/gst-summary` | GET | Owner | GSTR-1 preparation report (CGST, SGST, IGST, HSN summary) |
| `/reports/stock-valuation` | GET | Owner / Pharmacist | Current inventory valuation (FIFO/Purchase cost basis) |
| `/reports/schedule-h1-register`| GET| Pharmacist / Owner | Regulatory register of Schedule H1 & X dispensed drugs |
| `/reports/audit-logs` | GET | Owner | Comprehensive audit trail of operations |
