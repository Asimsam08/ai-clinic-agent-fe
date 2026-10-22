# AI Clinic Agent

Clinic operations dashboard and a labeled patient chat demo. The frontend talks to the existing Express API in `../ai-clinic-agent`. Patient simulation is not connected to WhatsApp.

## What you can do

- Register a clinic owner, sign in, and update the clinic profile.
- Add services and prices, staff, and a seven-day working schedule.
- Check real availability, create a pending appointment, and move it through confirmed, cancelled, completed, or no-show.
- Open the patient simulator, chat with the AI receptionist, choose a returned slot, consent to a hold, and confirm it. Records are stored in PostgreSQL.

Pending holds that pass `confirmationExpiresAt` are shown as expired. The backend expiry job cancels them.

## Prerequisites

- Node.js 22
- PostgreSQL
- A Gemini API key if you want the receptionist to reply (`GEMINI_API_KEY` on the backend)

## Backend

From `ai-clinic-agent`:

```bash
cp .env.example .env
```

Set `DATABASE_URL`, `JWT_SECRET`, and `GEMINI_API_KEY` in `.env`.

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

The API listens on `http://localhost:5000`. `GET /health` returns `{ "status": "ok" }`.

## Frontend

From `ai-clinic-agent-fe`:

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

`NEXT_PUBLIC_API_URL` must point at the backend. The dashboard stores the JWT from `POST /api/auth/login` or `POST /api/auth/register` and sends it as `Authorization: Bearer`.

## Suggested check

1. Register a clinic.
2. Save working hours, one service, and one staff member.
3. Create a pending appointment from the dashboard and confirm it.
4. Open the patient simulator, send a message, show slots for that service, consent to a booking, then confirm the hold.

The simulator calls:

- `GET /api/simulator/clinics`
- `GET /api/simulator/clinics/:clinicId`
- `POST /api/simulator/clinics/:clinicId/conversations`
- `POST /api/simulator/clinics/:clinicId/messages`
- `GET /api/simulator/clinics/:clinicId/availability`
- `POST /api/simulator/conversations/:conversationId/appointments`
- `POST /api/simulator/conversations/:conversationId/appointments/:appointmentId/confirm`

Clinic, patient, staff, and appointment IDs sent by the browser are checked again on the server against the active clinic or the simulator conversation.
