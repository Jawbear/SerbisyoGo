# F1 Navigation — demonstration and explanation

System title: **SerbisyoGo**. The application helps users find local home-service professionals and organize service requests.

## Three-minute demonstration

1. Open Home in Lab demo. Show the SerbisyoGo identity and explain that the demonstration uses labelled sample records.
2. Open Find a professional, select **Francis Romay**, and point out the plumbing service. Go Back and select **Art Ecleo**: the detail screen must now show Art and his electrical service. This proves that the selected record determines the destination screen.
3. Return to Francis and choose Plumbing home service. Enter a task of at least 10 characters, a complete address, city and four-digit postal code. Choose a future date/time.
4. Save and review. Show the same provider, task, address and appointment on BookingReview, together with the sample total.
5. Press Edit request details. Change the address, save again, and show the updated address in the review. The same `draftId` is retained.
6. Acknowledge the details and save the demo request. MyBookings must show one request awaiting provider acceptance, with a `DEMO-` reference.
7. Open the saved record and show the same information. Reload/restart and reopen MyBookings to demonstrate persistence.
8. Use the header Back button and, on a physical Android device, hardware/gesture Back. Also demonstrate Home/Find help/Bookings shortcuts and the no-results recovery action.

Do not present a demo request as a real booking. In live mode only an actual successful server confirmation produces a saved request, and the requested state still awaits provider acceptance.

## Rubric mapping

| Criterion | Demonstration/evidence |
| --- | --- |
| Screen development — 20 | Six core screens plus saved-record and sign-in screens; separate files in `src/screens/` |
| Navigation — 25 | `App.js` registers the native stack, titles, Back and logical screen order; shortcuts call the same navigator |
| Parameter passing — 20 | `providerId`, `serviceId`, `draftId`, `bookingId`; different selections resolve different records |
| UI consistency — 15 | Shared components in `src/components/ui.js`, dark/green tokens in `src/theme.js`, visible loading/error/empty states |
| Code understanding — 10 | Explain the examples and questions below using the actual source |
| AI documentation — 10 | `AI_DEVELOPMENT.md`, reviewed implementation, encountered errors and validation scope |

## Explain these four pieces of code

Register a destination in `App.js`:

```jsx
<Stack.Screen name="ProviderDetails" component={ProviderScreen}
  options={{ title: 'Provider details' }} />
```

Navigate with an identifier in `src/components/ui.js`:

```js
navigation.navigate('ProviderDetails', { providerId: provider.id });
```

Read the identifier and load its record in `ProviderScreen.js`:

```js
const providerId = route.params?.providerId;
const query = useData(`provider-${providerId}`, () => api.provider(providerId));
```

Return to the preceding screen:

```js
navigation.goBack();
```

IDs are serializable, small and sufficient to identify records. The destination gets current data from the repository instead of depending on a copied provider object. See [React Navigation's parameter guidance](https://reactnavigation.org/docs/params/).

## Likely questions

- **What is a stack?** A history of screens. Navigating adds or focuses a destination; Back returns through that history. The native stack supplies platform behaviour and headers.
- **What does NavigationContainer do?** Owns navigation state and connects screen navigation, linking and the theme.
- **Why pass providerId?** So ProviderDetails displays the provider selected by the user. The app must not hard-code a single person's information.
- **Why have a separate serviceId?** A provider may offer more than one service. The service must belong to the selected provider; mismatched IDs are rejected.
- **Where is form data stored?** The form holds edits in React state. Save creates/updates a draft in AsyncStorage for demo mode or through a trusted Supabase RPC in live mode. Review receives the draft ID and reloads that draft.
- **Why reset the stack after submission?** Back should not reopen a submitted form and encourage an accidental repeat submission. The draft UUID also supplies server idempotency in live mode.
- **Does a green success message mean paid or accepted?** No. The request is saved, payment is cash/manual, and the provider still needs to accept it.
- **What is still a manual check?** The actual Android/Expo Go device, hardware Back, keyboard behaviour and the hosted Snack after transferring the files.

## Before evaluation

Verify the Snack SDK/Expo Go versions match, load all assets before going offline, reset demo data if needed, and perform the complete flow on the actual demonstration device. Read and practise explaining the code; documentation is not a substitute for understanding it.
