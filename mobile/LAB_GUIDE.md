# F1 Navigation — evaluation guide

System title: **SerbisyoGo**. The mobile client connects directly to the same home-services system as the website. The user requested a final connected interface, so the earlier lab/demo mode has been removed.

## Demonstrate the connected flow

1. Open Home and browse available professionals. Select two different profiles and show that the selected record determines each detail screen. Use Back between selections.
2. Choose a service and sign in with an existing authorized customer account. The selected provider/service survives sign-in and appears in BookingForm.
3. Enter the task and complete address, then select an available appointment in Philippine time.
4. Save and review the draft. Show the same provider, task, address, schedule and server-calculated total.
5. Edit the address and review again. The same `draftId` is retained while the displayed address updates.
6. For an evaluation booking you intend to create, acknowledge the details and submit. MyBookings displays the saved request after actual server confirmation. It still awaits provider acceptance.
7. Open its detail screen. Reload and reopen MyBookings to show backend persistence. Sign out and show that private records require authentication.
8. Show Home/Find help/Bookings shortcuts and no-results recovery. Resize the laptop browser to phone/tablet widths. Hardware Back and the native keyboard must be checked separately on a physical device when available.

## Rubric mapping

| Criterion | Evidence |
| --- | --- |
| Screen development — 20 | Eight relevant screens in `src/screens/` |
| Navigation — 25 | Native stack, titles, Back, sign-in return destination and main shortcuts |
| Parameter passing — 20 | Provider/service/draft/booking IDs resolve the selected records |
| UI consistency — 15 | Shared dark/green components, responsive provider grid, loading/error/empty states |
| Understanding — 10 | Explain the actual code below and practise the complete flow |
| AI documentation — 10 | `AI_DEVELOPMENT.md` and current validation evidence |

## Explain these pieces

Register the destination in `App.js`:

```jsx
<Stack.Screen name="ProviderDetails" component={ProviderScreen}
  options={{ title: 'Provider details' }} />
```

Navigate with the selected identifier in `src/components/ui.js`:

```js
navigation.navigate('ProviderDetails', { providerId: provider.id });
```

Resolve it in `ProviderScreen.js`:

```js
const providerId = route.params?.providerId;
const query = useData(`provider-${providerId}`, () => api.provider(providerId));
```

Return through history:

```js
navigation.goBack();
```

Identifiers are small and serializable. Destinations obtain current data from the backend instead of relying on copied objects. See [React Navigation parameters](https://reactnavigation.org/docs/params/).

Be ready to explain `NavigationContainer`, stack history, the provider/service relationship, local form state versus saved backend drafts, server-calculated pricing, authentication checks and the stack reset after confirmation. Explain that a saved request is not automatically an accepted appointment or a paid transaction.
