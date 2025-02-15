interface MapUpsertOptions<K, T> {
  insert?: (key: K, self: Map<K, T>) => T;
  update?: (old: T, key: K, self: Map<K, T>) => T;
}

export function mapUpsert<K, T, Options extends MapUpsertOptions<K, T>>(
  map: Map<K, T>,
  key: K,
  options: Options,
): Options["insert"] extends Function ? T : T | undefined {
  if (map.has(key)) {
    const oldValue = map.get(key);
    if (options.update) {
      const newValue = options.update(oldValue!, key, map);
      map.set(key, newValue);
      return newValue;
    }
    return oldValue!;
  } else {
    if (options.insert) {
      const newValue = options.insert(key, map);
      map.set(key, newValue);
      return newValue;
    }
    return undefined as any;
  }
}


