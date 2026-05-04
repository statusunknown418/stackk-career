import { useEffect, useState } from "react";
import type { CodeHighlighterPlugin } from "streamdown";

let cachedPromise: Promise<CodeHighlighterPlugin> | null = null;

const loadCodePlugin = (): Promise<CodeHighlighterPlugin> => {
	cachedPromise ??= import("./streamdown-code-plugin").then((m) => m.code);
	return cachedPromise;
};

export const useCodePlugin = (): CodeHighlighterPlugin | null => {
	const [plugin, setPlugin] = useState<CodeHighlighterPlugin | null>(null);

	useEffect(() => {
		let cancelled = false;
		loadCodePlugin().then((loaded) => {
			if (!cancelled) {
				setPlugin(() => loaded);
			}
		});
		return () => {
			cancelled = true;
		};
	}, []);

	return plugin;
};
