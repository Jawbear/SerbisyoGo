# Shared Supabase contract for the Android/Expo client

The website does not own a private Next.js API. The React Native/Expo client in `mobile/` can use the same Supabase Auth users, public catalog, protected PostgREST reads, database functions, Storage signing endpoints and Postgres Changes streams through `@supabase/supabase-js`. The instructor's required stack is React Native with React Navigation. Keep service/secret keys out of the mobile bundle.

## Identity and money

- Authenticate with Supabase. Send the user access token for protected REST/RPC/Edge requests and refresh it through Auth.
- `user_context()` returns the verified database role and own profile. Roles are never chosen from editable user metadata.
- UUIDs identify records. All money fields are **integer centavos**, and commission configuration uses integer basis points.
- API instants are ISO-8601 UTC timestamps. Display appointment times in `Asia/Manila` and use that timezone when choosing calendar dates.
- Prefer the generated Postgres schema types over replicating enum/status assumptions. Status values use migration-safe text checks.

## Key RPCs

| Workflow | RPC / request | Contract |
| --- | --- | --- |
| Public discovery | `categories`, `public_providers`, `provider_services`, `reviews` reads | RLS returns active/approved/public rows only |
| Own profile | `save_profile(p_name,p_phone,p_preferences)` | Phone is `+639XXXXXXXXX`; no role/status parameter |
| Provider application | `submit_provider(p_profile)` | Pending until an admin reviews; approved public changes wait for review |
| Provider services | `save_provider_service(...)` | Own provider only; integer amounts and validated duration |
| Availability | `save_availability(p_week)` / `set_unavailable(...)` | Weekday 0=Sunday; minute offsets in Manila local time |
| Slots | `available_slots(p_service,p_day)` | Public availability only; does not reveal private customer records |
| Draft | `save_booking_draft(p_id,p_service,p_description,p_address,p_starts_at)` | Own persisted draft; address requires label/line1/city/4-digit postal code |
| Price | `draft_price(p_draft)` | Server-calculated current labor, fee, total and estimate flag |
| Submit | `confirm_booking(p_draft,p_expected_total)` | Idempotent per draft UUID; rejects changed price/availability |
| Quote | `booking_quote(p_booking,p_labor,p_accept)` | Assigned provider proposes; owning customer accepts; no confirmation without acceptance |
| Status | `transition_booking(p_booking,p_status,p_reason)` | Actor/source-state checks, locks, conflict prevention and persisted event |
| Location | `update_location(p_booking,p_lat,p_lng)` | Explicit provider permission and an active assigned job |
| Conversation | `send_message(p_conversation,p_body,p_nonce)` | Membership required; retain the UUID nonce when retrying the same message |
| Read state | `mark_read(p_conversation)` | Own membership only; null marks own notifications |
| Review | `submit_review(p_booking,p_rating,p_body)` | Owning customer + completed job; unique booking review |
| Concern | `open_case(...)`, `case_reply(...)`, `request_refund(...)` | Own booking/case access; customer replies never read internal notes |
| Upload | `POST /functions/v1/files` multipart | `file`, `kind`, optional `booking_id`, `draft_id`, `case_id`; server generates paths |
| Private file | `GET /functions/v1/files?id=UUID` | Authorized 60-second signed URL |
| Avatar | `GET /functions/v1/files?avatar=PROVIDER_UUID` | Public only for the approved provider's current avatar |
| Release | `app_releases` published read / `GET /functions/v1/releases?id=UUID` | Published metadata plus fresh artifact URL; no APK exists until supplied |

## Booking states

`requested → confirmed → en_route → in_progress → completed` is the provider path. An approved assigned provider may decline a request or cancel a confirmed job with a reason. An owning customer can cancel a requested/confirmed job. Administrators can record controlled cancellation/decline; they cannot impersonate normal completion or provider confirmation. Completion issues one immutable invoice. See `domain.ts` and the trusted SQL for the exact transition matrix.

Accepted appointments have an exclusion constraint and a provider lock. Always handle conflict errors by reloading available slots. Duplicate confirmation must reuse the same draft UUID; never create a new draft merely because a network request timed out.

## Payments

The website currently requests cash/manual settlement only. Neither Android nor a browser can mark a payment paid. Adding GCash/Maya/cards later requires a real provider adapter, server-side signature verification, amount/booking matching and an idempotent event key before trusted settlement. A payout approval is not a transfer. Do not interpret administrative records as evidence that funds moved without a verified external reference.

## Realtime and files

Subscribe to `messages`, `notifications`, `bookings`, and `booking_locations` using the user's session. Source RLS limits delivery to owners/members and approved administrators. Do not create public location or conversation broadcast channels. Remove subscriptions on sign-out/navigation and provide polling/reload when delivery fails. Last-shared coordinates do not imply current GPS position or an ETA.

Private file links expire in 60 seconds. Request a fresh one after expiry and avoid permanent storage URLs. Draft APK storage is never public. Android release upload/publish endpoints are administrative and should not be included in the customer app.

Configure native Auth redirect/deep-link allowlists separately from the website callback before adding native email verification/recovery. The current Expo milestone supplies existing-account sign-in and customer navigation; it does not claim native recovery, messaging or provider/admin operational parity. Expo configuration lives in `mobile/app.json`; no generated native Android project, signing key or APK is committed.
