"use client";

import { useEffect, useRef } from "react";

/**
 * Declarative `setInterval` for React. The callback is held in a ref so updating
 * it doesn't restart the timer, and passing `delay = null` pauses it. This keeps
 * components free of ad-hoc timer effects: callers describe "run this every N ms,
 * or not at all" instead of wiring up `setInterval`/`clearInterval` by hand.
 */
export function useInterval(callback: () => void, delay: number | null): void {
	const savedCallback = useRef(callback);

	// Keep the latest callback without re-subscribing the interval.
	useEffect(() => {
		savedCallback.current = callback;
	}, [callback]);

	useEffect(() => {
		if (delay === null) {
			return;
		}
		const id = setInterval(() => savedCallback.current(), delay);
		return () => clearInterval(id);
	}, [delay]);
}
