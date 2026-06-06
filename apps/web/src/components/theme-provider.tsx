/** biome-ignore-all lint/style/noNestedTernary: shadcn */
import { ScriptOnce } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

interface ThemeProviderProps {
	children: React.ReactNode;
	defaultTheme?: Theme;
	/** When set, locks the theme to this value and ignores any stored preference. */
	forcedTheme?: Theme;
	storageKey?: string;
}

interface ThemeProviderState {
	setTheme: (theme: Theme) => void;
	theme: Theme;
}

function getThemeScript(storageKey: string, defaultTheme: Theme, forcedTheme?: Theme) {
	const key = JSON.stringify(storageKey);
	const fallback = JSON.stringify(defaultTheme);

	if (forcedTheme) {
		const forced = JSON.stringify(forcedTheme);
		return `(function(){try{var t=${forced};var d=matchMedia('(prefers-color-scheme: dark)').matches;var r=t==='system'?(d?'dark':'light'):t;var e=document.documentElement;e.classList.add(r);e.style.colorScheme=r}catch(e){}})();`;
	}

	return `(function(){try{var t=localStorage.getItem(${key});if(t!=='light'&&t!=='dark'&&t!=='system'){t=${fallback}}var d=matchMedia('(prefers-color-scheme: dark)').matches;var r=t==='system'?(d?'dark':'light'):t;var e=document.documentElement;e.classList.add(r);e.style.colorScheme=r}catch(e){}})();`;
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

export function ThemeProvider({
	children,
	defaultTheme = "system",
	forcedTheme,
	storageKey = "theme",
}: ThemeProviderProps) {
	const [theme, setThemeState] = useState<Theme>(forcedTheme ?? defaultTheme);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		if (forcedTheme) {
			setThemeState(forcedTheme);
			setMounted(true);
			return;
		}
		const stored = localStorage.getItem(storageKey);
		setThemeState(stored === "light" || stored === "dark" || stored === "system" ? stored : defaultTheme);
		setMounted(true);
	}, [defaultTheme, storageKey, forcedTheme]);

	useEffect(() => {
		if (!mounted) {
			return;
		}
		applyTheme(theme);
	}, [theme, mounted]);

	useEffect(() => {
		if (!mounted || theme !== "system" || forcedTheme) {
			return;
		}

		const media = window.matchMedia("(prefers-color-scheme: dark)");
		const onChange = () => applyTheme("system");
		media.addEventListener("change", onChange);
		return () => media.removeEventListener("change", onChange);
	}, [theme, mounted, forcedTheme]);

	const setTheme = (next: Theme) => {
		if (forcedTheme) {
			return;
		}
		localStorage.setItem(storageKey, next);
		setThemeState(next);
	};

	return (
		<ThemeProviderContext value={{ theme, setTheme }}>
			<ScriptOnce>{getThemeScript(storageKey, defaultTheme, forcedTheme)}</ScriptOnce>
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
