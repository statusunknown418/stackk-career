/**
 * Coordinates "wait until a work queue is fully drained".
 *
 * The queue reports each completion through {@link QueueIdleBarrier.settle} with
 * its remaining (active + pending) job count; callers block on
 * {@link QueueIdleBarrier.wait}, passing the queue's current remaining count.
 * Every outstanding waiter resolves the first time `settle` observes zero
 * remaining work, so a waiter registered while saves are in flight resolves only
 * after the queue has finished — never before.
 */
export interface QueueIdleBarrier {
	/** Report a settled job; releases every waiter when `pending` reaches 0. */
	settle(pending: number): void;
	/** Resolve immediately when `pending` is 0, otherwise once the queue drains. */
	wait(pending: number): Promise<void>;
}

export function createQueueIdleBarrier(): QueueIdleBarrier {
	let waiters: Array<() => void> = [];

	const wait = (pending: number): Promise<void> => {
		if (pending === 0) {
			return Promise.resolve();
		}
		return new Promise<void>((resolve) => {
			waiters.push(resolve);
		});
	};

	const settle = (pending: number): void => {
		if (pending > 0) {
			return;
		}
		const released = waiters;
		waiters = [];
		for (const resolve of released) {
			resolve();
		}
	};

	return { wait, settle };
}
