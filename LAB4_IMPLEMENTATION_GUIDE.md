# SerbisyoGo · Laboratory Exercise 4
## F2 Networking and Data Storage

### A. Project and audit

A customer can now open **Find a professional**, choose a municipality served by a professional and keep the service/municipality combination for later. Three data sources answer different questions.

| Question | Source | Normal entry point |
| --- | --- | --- |
| Which municipalities are in Agusan del Sur? | PSGC Cloud, queried when the picker opens or refreshes | Find a professional → Choose municipality |
| Which approved professionals offer the selected service? | Existing Supabase catalog, including provider cities, declared service areas and active services | Find a professional → provider profile |
| Which filters did I save on this device? | React Native AsyncStorage | Find a professional → Saved searches |

The existing mobile project lives in `mobile/`. Its native stack in `App.js` connects Home, Find, provider details, sign-in, registration, verification, booking form, review, bookings, messages and provider credentials. Customers can browse and book. Providers can manage assigned requests and submit credentials. The home screen identifies Bunawan, Agusan del Sur as its locality, so this exercise lists municipalities and cities in that province.

The audit found Expo 55.0.32, React Native 0.83.10, React 19.2.0, Supabase JS 2.119.0 and AsyncStorage 2.2.0. The installed Expo SDK specifies the same AsyncStorage version. The mobile app already used fetch, authenticated Supabase calls and AsyncStorage for session persistence and an update reminder. Its discovery screen had active service categories and free-text search but lacked a geographic directory and customer-managed local preferences. The implementation reused the installed packages, current navigation and dark theme.

### B. Follow one external request

1. Open **Choose municipality**. The picker starts a request and shows **Loading available locations...** with a spinner.
2. `loadLocations` sends an HTTPS GET with `fetch`. A 15-second timer aborts slow work, including response reading. Closing the list cancels its request. Results from abandoned requests are ignored.
3. The code checks HTTP success, reads JSON and validates the array, provincial codes and names. It deduplicates by PSGC code and sorts the names. A valid empty array shows **No locations available.** A bad HTTP status, invalid payload, timeout or network failure shows **Unable to load locations. Check your internet connection.**
4. Select a name to apply it to discovery. **Refresh locations** and **Retry** issue fresh GETs. The interface attributes PSGC Cloud beside the list. The provider permits read-only geographic reference use. This endpoint requires no key. [Live endpoint](https://psgc.cloud/api/v2/regions/1600000000/provinces/1600300000/cities-municipalities) · [API documentation](https://psgc.cloud/api-docs/v2) · [Provider terms](https://psgc.cloud/terms)

See [locations.js](mobile/src/data/locations.js) and [LocationPicker.js](mobile/src/components/LocationPicker.js).

### C. Follow one local record

AsyncStorage is persistent app storage for small string values. The app owns the key `serbisyogo.discovery.saved-searches.v1`. Each record contains a UUID, category ID and display name, PSGC code and city name, optional label and ISO update time. Keep labels descriptive of the service and avoid personal details. These preferences are shared by users of this installation. Clearing app data or uninstalling can erase them.

| Action | What the code does |
| --- | --- |
| Save | Validates the selected fields, rejects duplicate category/PSGC pairs, generates a UUID with Expo Crypto and calls `setItem` with a JSON string. |
| Read | Calls `getItem` on opening the section or returning to the focused screen. A missing key means the list is empty. Existing JSON and records are validated before display. |
| Edit | Reloads the chosen filters into Find a professional. Saving changes replaces the row with the same UUID and sets a new update time. The label can be edited offline. |
| Delete | Asks for confirmation, removes the selected UUID and writes the remaining list. |

Writes are queued so overlapping actions cannot read the same old list and discard each other's changes. A success message follows a successful write. A failed read or malformed record produces an error and preserves existing contents. Only the saved-search key is used by these operations. [Storage operations](mobile/src/data/searchStore.js) · [AsyncStorage connection and controls](mobile/src/components/SavedSearches.js)

### D. Discovery and offline behavior

**Apply** restores the saved category and municipality and clears the temporary free-text query. Discovery intersects the service filter with the provider's city or declared service area. For example, a provider based elsewhere can match Bunawan if they list Bunawan in their service areas. A municipality can legitimately return zero professionals. **Clear municipality** returns to a wider search.

The saved-search controls sit outside the network-dependent catalog view. During an outage, open Saved searches to read, relabel, apply or delete a saved record. Applying a preference restores filters. Current provider availability and new bookings still require the backend. A saved municipality name is a local selection. The API picker requests the directory again when opened. [Find screen](mobile/src/screens/FindScreen.js) · [Provider matching](mobile/src/domain.js) · [Existing Supabase adapter](mobile/src/data/backend.js)

### E. Test the implementation

From the repository root, run the following commands in PowerShell.

```powershell
cd mobile
npm.cmd ls --depth=0
npm.cmd run lint
npm.cmd test
npm.cmd run test:e2e
node --input-type=module -e "import {loadLocations} from './src/data/locations.js'; console.table(await loadLocations())"
```

| Check | Observed result |
| --- | --- |
| Dependencies and static checks | The installed dependency tree resolved. AsyncStorage 2.2.0 matches Expo 55's bundled module list. Mobile ESLint passed. The JavaScript mobile package defines no separate type-check script. |
| Live PSGC call from the workstation | The production adapter returned 14 distinct places, including Bunawan, City of Bayugan and Veruela. |
| Mobile unit suite | All 29 tests passed. Lab tests cover invalid payloads, HTTP failure, timeout, empty responses, filter matching, CRUD, duplicate prevention, concurrent writes and storage failures. The store tests use an in-memory adapter. |
| Phone-sized Expo web tests | 27 passed using controlled backend responses. The picker showed its loading, error and empty states, retried, refreshed, and filtered providers after selection. Booking, sign-in and navigation regression tests also passed. The default run skips three opt-in live-account tests. A subsequent two-test run of lab4.spec.mjs also passed, including the newly added save/edit/delete regression across page reloads with the location request disconnected. |

The continuation audit found that an empty update ID could take the create branch. The storage adapter now rejects that call and the regression test checks that the list stays empty.

### Face-to-face demonstration

1. Install the lab APK and launch SerbisyoGo. Open **Find a professional**. Choose an available service category such as Plumbing.
2. Tap **Choose municipality**. Point out the loading spinner, the Agusan del Sur attribution and the returned names. Tap **Refresh locations** to repeat the request. The spinner may be brief on fast Wi-Fi.
3. Select **Bunawan**. Read the matching professionals or the no-results message. Open **Saved searches**, enter a short label such as “Home repairs”, then **Save search**. Wait for confirmation.
4. Close the app using Android Settings → Apps → SerbisyoGo → Force stop. Reopen normally, go to Find a professional → Saved searches, and locate the same label, municipality and service. Tap **Apply** to restore its filters.
5. Open Saved searches again and tap **Edit** on that row. Choose a different service or municipality above the saved-search form, then **Update saved search**. Confirm that one updated row is listed.
6. Turn on airplane mode and turn Wi-Fi off. Force-stop and reopen. Open the saved row, change its label and save. Reopen again to confirm the edit survived offline.
7. Open the municipality picker offline. Read the connection error, restore Wi-Fi, then tap **Retry** and choose a returned place. If the separate Supabase catalog failed during the outage, use its **Try again** control as well.
8. In Saved searches, tap **Delete**, then **Confirm delete**. Force-stop and reopen once more to show that the row stays deleted. No booking submission or payment is needed for this demonstration.

### F. AI development record

The task specification was the supplied “SERBISYOGO — LABORATORY EXERCISE 4 IMPLEMENTATION PROMPT”, phases 1–12. AI assistance was used to audit the existing Expo project, check candidate API endpoints and use terms, implement the picker and saved-search controls, extend provider filtering, write tests and prepare this guide. Sources of truth for grading are the running APK, implementation files and observed test results below.

The endpoint probe found a 404 on the candidate v1 path. The selected province-specific v2 route returned HTTP 200 with records inside a `data` array. A separate storage helper made corruption, write failures and concurrent operations reproducible in tests without damaging emulator data.

### G. Instructor questions

| Question | Student answer |
| --- | --- |
| What is an API? | It is an interface one program uses to ask another program for data or an action. |
| Why use an external API here? | The geographic directory supplies municipality names and stable location codes independently of the provider catalog. |
| What is fetch? | A JavaScript function that sends an HTTP request and returns a response asynchronously. |
| What is AsyncStorage? | A React Native key/value store that keeps small strings on the device. |
| How is it different from Supabase? | AsyncStorage holds device preferences. Supabase verifies accounts and stores shared provider and booking records. |
| How are API records retrieved? | Open the picker. The app requests one province, checks the response, parses JSON and displays the returned places. |
| What happens offline? | Fresh location requests show an error with Retry. Existing local searches remain accessible. |
| How is a preference saved? | The app validates the filters, adds a UUID and timestamp, serializes the list as JSON and awaits the storage write. |
| How do edit and delete work? | Both target the stored UUID. Edit replaces the selected row; confirmed deletion filters it out before writing. |
| Why does persistence matter? | Customers can reuse the same filters after an app restart, including when the network is unavailable. |

### Android build and live-account checks

The release build passed Gradle `:app:assembleRelease` and APK verification. The local output is [SerbisyoGo-0.5.5.apk](mobile/builds/SerbisyoGo-0.5.5.apk), package `com.serbisyogo.mobile`, version code 13. Its SHA-256 is `c6fec0a7bf24dc0b7d2516a07793adfcca2674ba2e34fe0238e792103a1ff4ed`. The APK contains a standalone JavaScript bundle and native libraries for ARM64, ARMv7 and x86_64. The existing signing certificate, official emblem and black adaptive-icon background are preserved.

For a rebuild on this configured workstation, run `node .cache/local-android.mjs --build` from the repository root. It reads the existing local SDK, JDK and signing configuration. The repository workflow provides a build procedure for other environments. [Android build instructions](mobile/ANDROID_BUILD.md)

The separate live Supabase read-only checks passed for the customer and administrator development accounts. The provider check timed out opening the page on its first attempt. On the isolated retry the login form opened and Supabase returned “Invalid login credentials” for the configured provider test account. Repeating the same read-only flow with the second provisioned provider account passed sign-in and the assigned-bookings check. The first fixture still needs current credentials. The controlled booking regression exercised submission and reload with a test backend.

### Native demonstration results

On November 18, 2026, the signed release ran without Metro on the project's Android 15 x86_64 emulator. Home → Find a professional, Android Back, FAQ and For Workers passed the navigation smoke test. An Android System UI dialog interrupted the first smoke run. Dismissing it and repeating the test succeeded.

| Demonstration step | Observed on the installed APK |
| --- | --- |
| Retrieve and refresh | The live directory displayed Bunawan and other Agusan del Sur places, and Refresh reloaded the list. |
| Create, restart and apply | Selected Air-conditioning from the Supabase catalog and Bunawan from PSGC. Saved the search, force-stopped the app, reopened it and used Apply to restore both filters. |
| Disconnect | Enabled airplane mode and disabled Wi-Fi and mobile data. The picker showed the connection error. The saved search remained accessible after a cold launch. |
| Edit offline | Changed the saved label to LabOffline, saved it and read it after another force-stop. During automation the first tap hit the label caption. Targeting the native text input completed the edit. |
| Delete offline | Confirmed deletion and saw the empty list after a further force-stop and relaunch. |
| Reconnect | Restored emulator networking and tapped Retry. The live municipality list returned. |

The live native run used the installed AsyncStorage module. The controlled web test separately held an HTTP response open to verify the loading indicator and supplied a valid empty array to verify the empty state. Android testing used an emulator. Production booking submission and physical handset testing were outside this validation run.
