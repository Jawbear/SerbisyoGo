const KEY = 'serbisyogo.discovery.saved-searches.v1';
const invalidData = 'Saved searches could not be read. Your stored data has been preserved.';

function fields(value) {
  const { categoryId, categoryName, cityCode, city, label } = value;
  if (typeof categoryId !== 'string' || typeof categoryName !== 'string' || !categoryName.trim()
    || !/^16003\d{5}$/.test(cityCode) || typeof city !== 'string' || !city.trim()
    || typeof label !== 'string' || label.trim().length > 60) {
    throw new Error('Choose a municipality and service filter. Keep the label within 60 characters.');
  }
  return { categoryId, categoryName: categoryName.trim(), cityCode, city: city.trim(), label: label.trim() };
}

export function createSearchStore(storage, makeId) {
  let pending = Promise.resolve();
  async function read() {
    let raw;
    try { raw = await storage.getItem(KEY); }
    catch { throw new Error('Cannot access saved searches on this device. Try again.'); }
    if (raw === null) return [];
    try {
      const rows = JSON.parse(raw);
      if (!Array.isArray(rows)) throw new Error();
      const ids = new Set();
      for (const row of rows) {
        fields(row);
        if (typeof row.id !== 'string' || !row.id || ids.has(row.id) || !Number.isFinite(Date.parse(row.updatedAt))) throw new Error();
        ids.add(row.id);
      }
      return rows;
    } catch { throw new Error(invalidData); }
  }
  function change(transform) {
    const result = pending.then(async () => {
      const rows = transform(await read());
      try { await storage.setItem(KEY, JSON.stringify(rows)); }
      catch { throw new Error('Could not save changes on this device. Try again.'); }
      return rows;
    });
    pending = result.catch(() => {});
    return result;
  }
  function put(value, id) {
    return change(rows => {
      const input = fields(value);
      if (id && !rows.some(row => row.id === id)) throw new Error('This saved search no longer exists.');
      if (rows.some(row => row.id !== id && row.cityCode === input.cityCode && row.categoryId === input.categoryId)) {
        throw new Error('This service and municipality are already saved.');
      }
      const record = { ...input, id: id || makeId(), updatedAt: new Date().toISOString() };
      return id ? rows.map(row => row.id === id ? record : row) : [...rows, record];
    });
  }
  return {
    getSavedPreferences: () => pending.then(read),
    savePreference: value => put(value),
    updatePreference: (id, value) => {
      if (typeof id !== 'string' || !id.trim()) {
        return Promise.reject(new Error('Choose a saved search to update.'));
      }
      return put(value, id);
    },
    deletePreference: id => change(rows => rows.filter(row => row.id !== id))
  };
}
