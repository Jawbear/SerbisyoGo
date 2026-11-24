// A session read may migrate an old value. Order it with refresh and sign-out
// so a delayed migration cannot restore a session after the user signs out.
export function createNativeSessionStorage(secureStore, legacyStore) {
  let pending = Promise.resolve();
  function inOrder(operation) {
    const result = pending.then(operation);
    pending = result.catch(() => {});
    return result;
  }

  return {
    getItem(key) {
      return inOrder(async () => {
        const encrypted = await secureStore.getItemAsync(key);
        const legacy = await legacyStore.getItem(key);
        if (legacy === null) return encrypted;
        if (encrypted === null) await secureStore.setItemAsync(key, legacy);
        await legacyStore.removeItem(key);
        return encrypted ?? legacy;
      });
    },
    setItem(key, value) {
      return inOrder(async () => {
        await secureStore.setItemAsync(key, value);
        await legacyStore.removeItem(key);
      });
    },
    removeItem(key) {
      return inOrder(async () => {
        // Delete the legacy value first so an interrupted logout cannot migrate it back.
        await legacyStore.removeItem(key);
        await secureStore.deleteItemAsync(key);
      });
    },
  };
}
