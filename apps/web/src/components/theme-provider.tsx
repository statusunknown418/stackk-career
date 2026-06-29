/** biome-ignore-all lint/style/noNestedTernary: shadcn */
import { ScriptOnce, useRouterState } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

interface ThemeProviderProps {
	children: React.ReactNode;
	defaultTheme?: Theme;
	storageKey?: string;
}

interface ThemeProviderState {
	setTheme: (theme: Theme) => void;
	theme: Theme;
}

/**
 * Routes that lock to a specific theme regardless of the user's preference.
 * The landing page is designed dark-only, so it always renders dark while the
 * rest of the app stays fully theme-switchable.
 */
const FORCED_ROUTE_THEMES: Record<string, Theme> = {
	"/": "dark",
	"/pricing": "dark",
};

function getThemeScript(storageKey: string, defaultTheme: Theme) {
	const key = JSON.stringify(storageKey);
	const fallback = JSON.stringify(defaultTheme);
	const forced = JSON.stringify(FORCED_ROUTE_THEMES);

	return `(function(){try{var f=${forced};var t=f[location.pathname];if(!t){t=localStorage.getItem(${key});if(t!=='light'&&t!=='dark'&&t!=='system'){t=${fallback}}}var d=matchMedia('(prefers-color-scheme: dark)').matches;var r=t==='system'?(d?'dark':'light'):t;var e=document.documentElement;e.classList.remove('light','dark');e.classList.add(r);e.style.colorScheme=r}catch(e){}})();`;
}

const ThemeProviderContext = createContext<ThemeProviderState>({
	theme: "system",
	setTheme: () => {
		return;
	},
});

function applyTheme(theme: Theme) {
	const root = document.documentElement;
	root.classList.remove("light", "dark");

	const resolved =
		theme === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : theme;

	root.classList.add(resolved);
	root.style.colorScheme = resolved;
}

export function ThemeProvider({ children, defaultTheme = "system", storageKey = "theme" }: ThemeProviderProps) {
	const pathname = useRouterState({ select: (state) => state.location.pathname });
	const forcedTheme = FORCED_ROUTE_THEMES[pathname];

	const [theme, setThemeState] = useState<Theme>(defaultTheme);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		const stored = localStorage.getItem(storageKey);
		setThemeState(stored === "light" || stored === "dark" || stored === "system" ? stored : defaultTheme);
		setMounted(true);
	}, [defaultTheme, storageKey]);

	const appliedTheme = forcedTheme ?? theme;

	useEffect(() => {
		if (!mounted) {
			return;
		}
		applyTheme(appliedTheme);
	}, [appliedTheme, mounted]);

	useEffect(() => {
		if (!mounted || appliedTheme !== "system") {
			return;
		}

		const media = window.matchMedia("(prefers-color-scheme: dark)");
		const onChange = () => applyTheme("system");
		media.addEventListener("change", onChange);
		return () => media.removeEventListener("change", onChange);
	}, [appliedTheme, mounted]);

	const setTheme = (next: Theme) => {
		localStorage.setItem(storageKey, next);
		setThemeState(next);
	};

	return (
		<ThemeProviderContext value={{ theme, setTheme }}>
			<ScriptOnce>{getThemeScript(storageKey, defaultTheme)}</ScriptOnce>
			{children}
		</ThemeProviderContext>
	);
}

export function useTheme() {
	const context = useContext(ThemeProviderContext);
	if (context === undefined) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}
	return context;
}
