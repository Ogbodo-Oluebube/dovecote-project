# Dovecote API Documentation

Base URL (local): `http://localhost:5000/api`
Base URL (deployed): `https://YOUR-APP.onrender.com/api`

## Conventions

### Response format

Every response, success or error, has the same shape.

**Success**
```json
{
  "success": true,
  "message": "Notification queued",
  "data": { }
}
```

**Error**
```json
{
  "success": false,
  "message": "Notification not found",
  "data": null
}
```

When several validation rules fail, the messages are joined with `, ` in one string.

### Authentication

Protected endpoints need a JWT in the `Authorization` header:

```
Authorization: Bearer <token>
```

Get a token from `POST /auth/login` or `POST /auth/register` (`data.token`). Tokens expire after 7 days by default.

### Roles

| Role | Can do |
|---|---|
| `user` | Manage their own notifications, templates and inbox |
| `admin` | Everything a user can do, plus see **all** users' notifications, view global stats, list users and change roles |

### Notification statuses

| Status | Meaning |
|---|---|
| `pending` | Waiting for the worker (or waiting for its scheduled time / next retry) |
| `processing` | The worker is delivering it right now |
| `sent` | Delivered |
| `failed` | All attempts used up; can be retried manually |
| `cancelled` | Stopped before it was sent |

### Common errors

| Status | Message | Cause |
|---|---|---|
| 400 | Validation messages / `Invalid ID` / `Invalid JSON body` | Bad input |
| 401 | `Authentication required` | Missing or malformed `Authorization` header |
| 401 | `Invalid or expired token` | Token is wrong, expired or signed with a different secret |
| 403 | `Insufficient permission` | Valid token, but the role is not allowed |
| 404 | `Route not found` / `<Thing> not found` | Unknown route, or record missing / not yours |
| 409 | Conflict message | Action not allowed in the current state, or duplicate |
| 500 | `Something went wrong` | Unexpected server error (details are only logged on the server) |

---

## Endpoint summary

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | No | Health check |
| POST | `/auth/register` | No | Create an account |
| POST | `/auth/login` | No | Log in and get a token |
| GET | `/auth/me` | Yes | Current user |
| POST | `/notifications` | Yes | Queue a notification |
| GET | `/notifications` | Yes | List notifications (search, filter, paginate) |
| GET | `/notifications/:id` | Yes | Notification details |
| GET | `/notifications/:id/attempts` | Yes | Delivery attempt history |
| POST | `/notifications/:id/retry` | Yes | Re-queue a failed notification |
| POST | `/notifications/:id/cancel` | Yes | Cancel a pending notification |
| GET | `/stats` | Yes | Counts by status and success rate |
| GET | `/templates` | Yes | List my templates |
| POST | `/templates` | Yes | Create a template |
| PUT | `/templates/:id` | Yes | Update a template |
| DELETE | `/templates/:id` | Yes | Delete a template |
| GET | `/inbox` | Yes | My in-app messages |
| PATCH | `/inbox/:id/read` | Yes | Mark a message as read |
| GET | `/admin/users` | Admin | List all users |
| PATCH | `/admin/users/:id/role` | Admin | Change a user's role |

---

## Health

### `GET /health`

**Auth:** none

**Success (200)**
```json
{ "success": true, "message": "Dovecote is running", "data": { "uptime": 123.45 } }
```

---

## Auth

### `POST /auth/register`

Create an account. New accounts are always `user`. The role cannot be set from the request.

**Auth:** none

**Body**

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | Yes | Not empty |
| `email` | string | Yes | Valid email, unique |
| `password` | string | Yes | At least 8 characters |

**Success (201)**
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "token": "eyJhbGciOi...",
    "user": { "_id": "665f...", "name": "Ada", "email": "ada@test.com", "role": "user" }
  }
}
```

**Errors**

| Status | Message |
|---|---|
| 400 | `Password must be at least 8 characters` |
| 400 | `Enter a valid email` |
| 409 | `Email already registered` |

### `POST /auth/login`

**Auth:** none

**Body**

| Field | Type | Required |
|---|---|---|
| `email` | string | Yes |
| `password` | string | Yes |

**Success (200):** same shape as register, with message `Logged in successfully`.

**Errors**

| Status | Message |
|---|---|
| 400 | `Enter a valid email` / `Password is required` |
| 401 | `Invalid email or password` |

### `GET /auth/me`

**Auth:** required

**Success (200)**
```json
{ "success": true, "message": "Current user", "data": { "_id": "665f...", "name": "Ada", "email": "ada@test.com", "role": "user" } }
```

**Errors:** 401 (no or invalid token, or the account no longer exists).

---

## Notifications

A notification object:

```json
{
  "_id": "6660...",
  "userId": "665f...",
  "channel": "sms",
  "recipient": "+2348012345678",
  "subject": "",
  "message": "Your order has shipped",
  "status": "pending",
  "attempts": 0,
  "maxAttempts": 3,
  "nextAttemptAt": "2026-09-24T10:00:00.000Z",
  "scheduledFor": null,
  "priority": 0,
  "lastError": null,
  "sentAt": null,
  "createdAt": "2026-09-24T10:00:00.000Z",
  "updatedAt": "2026-09-24T10:00:00.000Z"
}
```

### `POST /notifications`

Queue a notification. The request is saved and answered immediately. **Nothing is sent during this request**; the background worker delivers it.

**Auth:** required

**Body**

| Field | Type | Required | Rules |
|---|---|---|---|
| `channel` | string | Yes | `email`, `sms` or `in_app` |
| `recipient` | string | Yes | `email` / `in_app`: a valid email. `sms`: phone number, 7 to 15 digits, optional leading `+` |
| `subject` | string | Email only | Required when channel is `email` |
| `message` | string | Unless `templateId` is sent | Max 2000 characters |
| `scheduledFor` | ISO 8601 date | No | Must be in the future. Send a full ISO string with timezone, e.g. `2026-10-01T09:00:00.000Z` |
| `priority` | integer | No | `0` normal (default), `1` high, `2` urgent. Higher is sent first |
| `templateId` | string | No | ID of one of your templates. The template's channel must match `channel` |
| `variables` | object | No | Values for `{{placeholders}}` in the template, e.g. `{ "name": "Ada" }` |

When `templateId` is given, the server builds `subject` and `message` from the template and `variables`. Placeholders with no value are left as written.

**Example**
```bash
curl -X POST http://localhost:5000/api/notifications \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"channel":"sms","recipient":"+2348012345678","message":"Your order has shipped"}'
```

**Success (201)**
```json
{ "success": true, "message": "Notification queued", "data": { "_id": "6660...", "status": "pending", "...": "..." } }
```

**Errors**

| Status | Message |
|---|---|
| 400 | `Channel must be email, sms or in_app` |
| 400 | `Enter a valid phone number, e.g. +2348012345678` |
| 400 | `Enter a valid recipient email` |
| 400 | `Subject is required for email` |
| 400 | `Message is required` / `Message is too long (max 2000 characters)` |
| 400 | `scheduledFor must be in the future` |
| 400 | `Template channel does not match` |
| 404 | `Template not found` |

### `GET /notifications`

List notifications, newest first. Users see their own; admins see everyone's.

**Auth:** required

**Query parameters**

| Param | Default | Description |
|---|---|---|
| `page` | `1` | Page number |
| `limit` | `10` | Page size (1 to 100) |
| `status` | | Filter: `pending`, `processing`, `sent`, `failed`, `cancelled` |
| `channel` | | Filter: `email`, `sms`, `in_app` |
| `search` | | Case-insensitive match on recipient or subject |

Example: `GET /notifications?status=failed&channel=sms&page=1&limit=10`

**Success (200)**
```json
{
  "success": true,
  "message": "Notifications fetched",
  "data": { "items": [ { "...": "..." } ], "page": 1, "limit": 10, "total": 42, "totalPages": 5 }
}
```

### `GET /notifications/:id`

**Auth:** required. Owner or admin.

**Success (200):** the notification object.

**Errors**

| Status | Message |
|---|---|
| 400 | `Invalid notification ID` |
| 404 | `Notification not found` (also returned when it belongs to someone else) |

### `GET /notifications/:id/attempts`

Every delivery attempt, oldest first. This powers the timeline on the detail page.

**Auth:** required. Owner or admin.

**Success (200)**
```json
{
  "success": true,
  "message": "Delivery attempts fetched",
  "data": [
    { "attemptNumber": 1, "status": "failed", "error": "Carrier timeout", "durationMs": 412, "createdAt": "..." },
    { "attemptNumber": 2, "status": "success", "durationMs": 380, "createdAt": "..." }
  ]
}
```

**Errors:** same as `GET /notifications/:id`.

### `POST /notifications/:id/retry`

Re-queue a **failed** notification. It gets 3 more attempts (`maxAttempts` increases by 3) and is picked up again immediately. Attempt numbers keep counting up.

**Auth:** required. Owner or admin. **Body:** none.

**Success (200):** the updated notification with `status: "pending"`.

**Errors**

| Status | Message |
|---|---|
| 404 | `Notification not found` |
| 409 | `Only failed notifications can be retried` |

### `POST /notifications/:id/cancel`

Cancel a **pending** notification.

**Auth:** required. Owner or admin. **Body:** none.

**Success (200):** the updated notification with `status: "cancelled"`.

**Errors**

| Status | Message |
|---|---|
| 404 | `Notification not found` |
| 409 | `Only pending notifications can be cancelled` (for example, the worker already picked it up) |

---

## Stats

### `GET /stats`

Counts by status. Users see their own numbers; admins see the whole system.

**Auth:** required

**Success (200)**
```json
{
  "success": true,
  "message": "Stats fetched",
  "data": {
    "pending": 3, "processing": 0, "sent": 40, "failed": 2, "cancelled": 1,
    "total": 46, "successRate": 95.2
  }
}
```

`successRate` is `sent / (sent + failed) * 100`, rounded to one decimal. It is `0` when nothing has finished yet.

---

## Templates

Templates are private to the user who created them. Use `{{variable}}` placeholders in `subject` and `body`.

A template object: `{ "_id", "userId", "name", "channel", "subject", "body", "createdAt", "updatedAt" }`

### `GET /templates`
**Auth:** required. **Success (200):** array of templates, newest first.

### `POST /templates`

| Field | Type | Required |
|---|---|---|
| `name` | string | Yes |
| `channel` | `email` / `sms` / `in_app` | Yes |
| `subject` | string | No |
| `body` | string | Yes |

**Success (201):** the created template.
**Errors:** 400 `Template name is required` / `Invalid channel` / `Template body is required`.

### `PUT /templates/:id`
Same body as create. **Success (200):** the updated template.
**Errors:** 400 (validation or `Invalid template ID`), 404 `Template not found`.

### `DELETE /templates/:id`
**Success (200):** `{ "success": true, "message": "Template deleted", "data": null }`
**Errors:** 400 `Invalid template ID`, 404 `Template not found`.

---

## Inbox

In-app notifications delivered to the logged-in user. A message arrives when an `in_app` notification is sent to that user's account email.

### `GET /inbox`
**Auth:** required

**Success (200)**
```json
{
  "success": true,
  "message": "Inbox fetched",
  "data": {
    "items": [ { "_id": "...", "title": "Welcome", "body": "Hi Ada", "isRead": false, "createdAt": "..." } ],
    "unread": 1
  }
}
```

### `PATCH /inbox/:id/read`
**Auth:** required. **Body:** none.
**Success (200):** the message with `isRead: true`.
**Errors:** 400 `Invalid message ID`, 404 `Message not found`.

---

## Admin

All admin endpoints need a token for a user with `role: "admin"`. Others get `403 Insufficient permission`.

### `GET /admin/users`
**Success (200):** array of all users (no passwords), newest first.

### `PATCH /admin/users/:id/role`

| Field | Type | Required | Rules |
|---|---|---|---|
| `role` | string | Yes | `user` or `admin` |

**Success (200):** the updated user.

**Errors**

| Status | Message |
|---|---|
| 400 | `Role must be user or admin` / `Invalid user ID` |
| 400 | `You cannot change your own role` |
| 404 | `User not found` |

---

## How a notification moves through the queue

```
POST /notifications
        │  saved as "pending", response returned immediately
        ▼
Worker (every few seconds) claims the next due notification
        │  status "processing", attempts + 1
        ▼
   Deliver via email / sms / in_app
     │                  │
  success             failure
     │                  │
  "sent"      attempts left?
                 │           │
                yes          no
                 │           │
        "pending" again   "failed"
        after a delay     (retry by hand)
        (10s, 20s, 40s…)
```

A notification stuck in `processing` for more than 5 minutes (for example after a server crash) is returned to `pending` automatically.
