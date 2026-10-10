# Talladega family reunion

Responsive, buildless family planner with a Supabase database, private photo storage, and password-authenticated Edge Function.

## Development

Run `npm run dev` and open http://127.0.0.1:4173. Run `npm test` for date and shirt-count checks. The local preview uses the real backend. Do not enter demonstration records into the current reunion year.

## Access and data

One shared password grants access to the entire family's records. The server verifies a salted PBKDF2 hash and issues a signed 30-day session. Remembering a device stores the session, never the password. Locking the device removes its local session. Failed login attempts are limited per IP to 30 in 15 minutes. Password and service credentials are not included in browser assets.

All records are grouped by reunion year. Dates, campground, sites, people, meal assignments, shirt plans, and messages are editable. Trip dates are Friday through Monday; arrival is picked from that year's Fridays.

People belong to a **crew**: whoever travels, camps, and cooks together, named after the grown-ups (e.g. "Mike & Lisa"). It is stored in the record's `family` field. Meals are claimed by crew. Each device can remember who is using it ("Who's this?", saved in localStorage only) to fill in chat names and default meal crews. It is a convenience, not an identity check; everyone shares the one family password.

The interface follows iOS conventions: bottom tab bar on phones, grouped lists, and bottom sheets for editing. Light and dark mode follow the device setting unless overridden in Settings (stored per device). The meal planner creates Friday dinner, three Saturday meals, and three Sunday meals. Changing dates preserves assignments against their old dates. Data is refreshed after edits and with the Refresh plans button; simultaneous edits to the same record use the last saved edit.

Photos are private, accessed through the authenticated API, and limited to JPEG/PNG/WebP at 10 MB each. The album has its own year chips, so past years can be browsed without switching the planner, and photos can be uploaded to any year from 2000 on (an empty trip record is created for a new year so it appears in the list). Shirt orders export as CSV. Lincoln weather is fetched from Open-Meteo in Fahrenheit for dates within its forecast window.

## Deployment

The Sites identity is tracked in `.openai/hosting.json`. Static assets are in `dist/`. The Edge Function source is `supabase/functions/reunion-api/index.ts`; `supabase/schema.sql` records the initial schema deployed through the Supabase migration tool. Tables deny access to anonymous/authenticated browser roles. Only the Edge Function uses the server-side Supabase service credential, after verifying the family session.

The password is delivered separately to the organizer. To set or rotate it, run `node scripts/set-password.mjs` locally and paste the printed SQL into the Supabase SQL editor. Existing signed sessions last up to 30 days; rotate the session-signing mechanism if immediate global revocation is required. No account password belongs in source control.

Custom domain: https://talladega.murphsmitts.com (DNS and TLS validated October 10, 2026).
