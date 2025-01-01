export class UniqueQueue<T extends number> {
  public set: Set<T> = new Set();
  public queue: Array<T> = [];

  push(...items: T[]) {
    for (const item of items) {
      if (!this.set.has(item)) {
        this.set.add(item);
        this.queue.push(item);
        this.queue.sort((a, b) => a - b);
      }
    }
  }

  pop() {
    return this.queue.shift();
  }

  peek() {
    return this.queue[0];
  }

  isEmpty() {
    return this.queue.length === 0;
  }
}
