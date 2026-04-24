import { useEffect, useState } from "react";

interface UseTypewriterResult {
	displayed: string;
	done: boolean;
}

export function useTypewriter(text: string, speedMs = 18): UseTypewriterResult {
	const [displayed, setDisplayed] = useState("");

	useEffect(() => {
		setDisplayed("");

		if (!text) {
			return;
		}

		let index = 0;
		const interval = setInterval(() => {
			index += 1;
			setDisplayed(text.slice(0, index));
			if (index >= text.length) {
				clearInterval(interval);
			}
		}, speedMs);

		return () => clearInterval(interval);
	}, [text, speedMs]);

	return { displayed, done: displayed.length === text.length && text.length > 0 };
}
