# Dovecote

**Every message gets delivered. Or gets another try.**

Dovecote is a notification queue. You submit an email, SMS or in-app notification and get an instant response. A background worker delivers it later, retries it if it fails, and records every attempt so you can see what happened.

Built for the TS Academy Capstone Project (Project 24: Notification Queue System).

**Live app:** https://YOUR-APP.onrender.com
**API docs:** [docs/API.md](docs/API.md)

## The problem

Sending notifications inside a web request is slow and fragile. If an email provider is down for a minute, the message is lost and the user waits. Dovecote separates **accepting** a notification from **delivering** it, so requests are fast and failures are retried instead of forgotten.

## Features

**For users**
- Register, log in, and manage their own queue
- Send email, SMS or in-app notifications, now or scheduled for later
- Priority levels (urgent notifications go first)
- Templates with `{{variables}}`
- Search, filter and paginate notifications
- A delivery timeline for each notification showing every attempt and its error
- Cancel a pending notification or retry a failed one
- In-app inbox with unread tracking

**For admins**
- See every user's notifications
- System stats: pending, sent, failed, success rate
- Failed queue with one-click retry
- Manage user roles

## How the queue works

1. `POST /api/notifications` validates the request, saves it as `pending`, and responds immediately.
2. A worker runs every few seconds. It atomically claims the next due notification (highest priority first), so it can never be picked up twice.
3. It calls the delivery provider for that channel and records a `DeliveryAttempt`.
4. On success the notification becomes `sent`. On failure it goes back to `pending` with an exponential delay (10s, then 20s, then 40s) until `maxAttempts` is reached, then becomes `failed`.
5. A notification stuck in `processing` for over 5 minutes (a crash mid-send) is put back in the queue.

The SMS provider is a **simulated carrier** that fails at a configurable rate (`SMS_FAILURE_RATE`), which is what makes retries easy to demonstrate. Email goes through SMTP (Mailtrap by default). In-app notifications are written to the recipient's inbox.

The worker runs inside the same Node process as the API, using a polling loop over MongoDB. There is no Redis or other extra infrastructure.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS and vanilla JavaScript (ES modules) |
| Backend | Node.js, Express |
| Database | MongoDB with Mongoose |
| Auth | JWT, bcrypt password hashing |
| Validation | express-validator |
| Email | Nodemailer with Mailtrap |
| Tests | Jest, Supertest |

Express serves the `frontend/` folder as static files, so the app is one deployment with no CORS setup.

## Project structure

```
dovecote/
├── backend/
│   ├── src/
│   │   ├── config/         database connection
│   │   ├── models/         User, Notification, DeliveryAttempt, Template, InboxMessage
│   │   ├── controllers/    request handlers
│   │   ├── routes/         routes and validation rules
│   │   ├── middleware/     auth, validate, errorHandler
│   │   ├── services/       queueWorker and delivery providers
│   │   ├── utils/          response helpers, ApiError, seedAdmin
│   │   ├── tests/
│   │   ├── app.js          Express app
│   │   └── server.js       entry point (connects DB, starts worker)
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── *.html              one file per page
│   ├── css/
│   └── js/                 api.js, auth.js, ui.js and pages/
└── docs/API.md
```

## Getting started

**You need:** Node.js 20 or newer, and MongoDB (local install, or a free MongoDB Atlas cluster).

```bash
git clone <your-repo-url>
cd dovecote/backend
npm install
cp .env.example .env      # then fill in the values below
npm run dev
```

Open http://localhost:5000. The API and the website run on the same port.

### Environment variables

Set these in `backend/.env`. Never commit this file.

| Variable | Description | Default / example |
|---|---|---|
| `PORT` | Server port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/dovecote` |
| `MONGO_URI_TEST` | Separate database for tests (**its data is deleted**) | `mongodb://localhost:27017/dovecote_test` |
| `JWT_SECRET` | Secret used to sign tokens | a long random string |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `WORKER_INTERVAL_MS` | How often the worker checks the queue | `3000` |
| `RETRY_BASE_DELAY_MS` | First retry delay; doubles each time | `10000` |
| `SMS_FAILURE_RATE` | Chance (0 to 1) that the simulated SMS fails | `0.3` |
| `SMTP_HOST`, `SMTP_PORT` | SMTP server | `sandbox.smtp.mailtrap.io`, `2525` |
| `MAILTRAP_USER`, `MAILTRAP_PASS` | SMTP credentials from your Mailtrap inbox | |
| `MAIL_FROM` | Sender address on emails | `Dovecote <no-reply@dovecote.app>` |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Used by the admin seed script | |

Generate a strong `JWT_SECRET`:

```bash
node --input-type=module -e "import {randomBytes} from 'crypto'; console.log(randomBytes(32).toString('hex'))"
```

### Create an admin

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`, then:

```bash
npm run seed:admin
```

If that email already exists, the account is promoted to admin.

### Scripts

| Command | What it does |
|---|---|
| `npm start` | Run the server |
| `npm run dev` | Run with auto-restart (nodemon) |
| `npm run seed:admin` | Create or promote the admin account |
| `npm test` | Run the test suite |

## Try it: watch a retry happen

1. Set `SMS_FAILURE_RATE=0.8` and `RETRY_BASE_DELAY_MS=5000` in `.env`, then restart.
2. Register, log in, open **Send**, choose **SMS**, enter `+2348012345678` and any message.
3. Open the notification from the list. The delivery timeline updates by itself. You will usually see failed attempts followed by a delivery, or all three failing and the status turning to `failed`.
4. If it failed, press **Retry** to give it three more attempts.

## Testing

```bash
npm test
```

The tests use `MONGO_URI_TEST` and **delete the data in that database**, so never point it at your real one. They cover:
- Registration, login, duplicate emails, and protected routes
- A failing delivery being retried and then marked `failed` after `maxAttempts`
- A working delivery being marked `sent`
- A scheduled notification not being picked up early

## Security

- Passwords are hashed with bcrypt and never returned in responses
- JWT authentication on all private routes, with role checks for admin routes
- Users can only see and change their own records; admins are the exception
- Every request body and ID is validated on the server
- Query parameters are type-checked and search text is escaped, to block NoSQL injection and regex abuse
- Secrets live in environment variables, and `.env` is git-ignored
- User-provided text is escaped before it is rendered in the browser
- `helmet` sets security headers

## Deployment

**Database:** create a free cluster on MongoDB Atlas, add a database user, allow network access, and copy the connection string.

**Server (Render):**

| Setting | Value |
|---|---|
| Root directory | `backend` |
| Build command | `npm install` |
| Start command | `npm start` |
| Environment variables | everything from the table above, with production values |

Note for free hosting: the worker lives inside the web server, so if the host puts the app to sleep, queued notifications wait until it wakes up. Scheduled and retried notifications then run once it is back.

## Limitations and ideas for later

- The queue is a database polling loop. For very high volume, swap it for BullMQ and Redis
- SMS is simulated; a real provider such as Twilio would replace `smsProvider.js`
- Live updates use polling every few seconds instead of WebSockets
- Priority is a simple sort order, not separate queues

## Git workflow

This project was built solo, but it still follows a normal branch-and-Pull-Request workflow:

- `main` only receives merged Pull Requests, never direct commits
- Each piece of work gets its own branch: `feature/...`, `fix/...`, `docs/...`
- Each branch is merged through a Pull Request, with a merge commit so the individual commits stay visible in the history
- Commit messages follow `feat(scope): ...`, `fix(scope): ...`, `docs: ...`, `test(scope): ...`, `chore: ...`

## Author

Built solo by **YOUR NAME**: database design, backend API, queue worker, frontend, tests, documentation and deployment.

## License

Built for educational purposes as a TS Academy capstone.
