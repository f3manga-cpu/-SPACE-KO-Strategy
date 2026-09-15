/** Stable, tiny PRNG utilities.  Question and scheduler output must be replayable. */

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function mixSeed(seed: number, salt: string | number): number {
  const saltHash = typeof salt === "number" ? salt >>> 0 : hashString(salt);
  let value = (seed >>> 0) ^ saltHash ^ 0x9e3779b9;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return (value ^ (value >>> 15)) >>> 0;
}

export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function deterministicUnit(seed: number, salt: string | number): number {
  return createRng(mixSeed(seed, salt))();
}

export function pick<T>(values: readonly T[], rng: () => number): T {
  if (values.length === 0) throw new RangeError("cannot pick from an empty list");
  return values[Math.min(values.length - 1, Math.floor(rng() * values.length))]!;
}

export function shuffle<T>(values: readonly T[], rng: () => number): T[] {
  const output = [...values];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [output[index], output[swapIndex]] = [output[swapIndex]!, output[index]!];
  }
  return output;
}

export function range(
  rng: () => number,
  minimum: number,
  maximum: number,
): number {
  return minimum + (maximum - minimum) * rng();
}

