function hashString(input: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export class NamedRandomStreams {
  private readonly streams = new Map<string, () => number>();

  constructor(private readonly seed: string) {}

  next(stream: string) {
    const existing = this.streams.get(stream);
    if (existing) return existing();
    const created = mulberry32(hashString(`${this.seed}:${stream}`));
    this.streams.set(stream, created);
    return created();
  }

  chance(stream: string, probability: number) {
    return this.next(stream) < probability;
  }

  pick<T>(stream: string, values: readonly T[]) {
    if (values.length === 0)
      throw new Error(`Cannot pick from empty ${stream}`);
    return values[Math.floor(this.next(stream) * values.length)]!;
  }
}
