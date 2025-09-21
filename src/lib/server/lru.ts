export class LruIdSet {
  private readonly map = new Map<string, number>();

  constructor(private readonly capacity: number) {}

  has(id: string): boolean {
    return this.map.has(id);
  }

  add(id: string): void {
    if (this.map.has(id)) {
      this.map.delete(id);
    }
    this.map.set(id, Date.now());
    this.trim();
  }

  addMany(ids: string[]): void {
    for (const id of ids) {
      this.add(id);
    }
  }

  values(): string[] {
    return Array.from(this.map.keys());
  }

  clear(): void {
    this.map.clear();
  }

  private trim(): void {
    while (this.map.size > this.capacity) {
      const oldest = this.map.keys().next();
      if (oldest.done) {
        break;
      }
      this.map.delete(oldest.value);
    }
  }
}
