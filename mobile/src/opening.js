// An unresolved or invalid session uses the existing sign-in flow. That screen
// will move to Home if an in-flight session verification subsequently succeeds.
export function openingDestination(identity) {
  return identity ? { name: 'Home' } : { name: 'SignIn', params: { fromOpening: true } };
}
