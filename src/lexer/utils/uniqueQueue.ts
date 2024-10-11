export class UniqueQueue<T> {
	public set: Set<T> = new Set();
	public queue: Array<T> = [];

	push(item: T) {
		if (!this.set.has(item)) {
			this.set.add(item);
			this.queue.push(item);
		}
	}

	pop() {
		const item = this.queue.shift();
		return item;
	}

	peek() {
		return this.queue[0];
	}

	isEmpty() {
		return this.queue.length === 0;
	}
}