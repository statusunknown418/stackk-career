import { createHighlighterCore, type HighlighterCore } from "shiki/dist/core.mjs";
import { createJavaScriptRegexEngine } from "shiki/dist/engine-javascript.mjs";
import markdown from "shiki/langs/markdown.mjs";
import shellscript from "shiki/langs/shellscript.mjs";
import tsx from "shiki/langs/tsx.mjs";
import githubDark from "shiki/themes/github-dark.mjs";
import githubLight from "shiki/themes/github-light.mjs";
import type { CodeHighlighterPlugin, ThemeInput } from "streamdown";

type HighlightResult = NonNullable<ReturnType<CodeHighlighterPlugin["highlight"]>>;

const shikiLanguages = {
	markdown,
	shellscript,
	tsx,
} as const;
type SupportedShikiLanguage = keyof typeof shikiLanguages;

const languageAliases: Record<string, SupportedShikiLanguage> = {
	bash: "shellscript",
	js: "tsx",
	javascript: "tsx",
	jsx: "tsx",
	md: "markdown",
	sh: "shellscript",
	shell: "shellscript",
	ts: "tsx",
	typescript: "tsx",
};

const themes = [githubLight, githubDark] satisfies [ThemeInput, ThemeInput];
const highlighterCache = new Map<SupportedShikiLanguage, Promise<HighlighterCore>>();
const tokensCache = new Map<string, HighlightResult>();
const subscribers = new Map<string, Set<(result: HighlightResult) => void>>();

const getThemeName = (theme: ThemeInput) => (typeof theme === "string" ? theme : (theme.name ?? "custom"));

const getSupportedLanguage = (language: string): SupportedShikiLanguage | null => {
	const normalizedLanguage = language.trim().toLowerCase();
	if (normalizedLanguage in shikiLanguages) {
		return normalizedLanguage as SupportedShikiLanguage;
	}

	return languageAliases[normalizedLanguage] ?? null;
};

const getTokensCacheKey = (code: string, language: string, themeNames: [string, string]) => {
	const start = code.slice(0, 100);
	const end = code.length > 100 ? code.slice(-100) : "";
	return `${language}:${themeNames[0]}:${themeNames[1]}:${code.length}:${start}:${end}`;
};

const getHighlighter = (language: SupportedShikiLanguage): Promise<HighlighterCore> => {
	const cached = highlighterCache.get(language);
	if (cached) {
		return cached;
	}

	const highlighterPromise = createHighlighterCore({
		engine: createJavaScriptRegexEngine({ forgiving: true }),
		langs: [shikiLanguages[language]],
		themes,
	});

	highlighterCache.set(language, highlighterPromise);
	return highlighterPromise;
};

export const code: CodeHighlighterPlugin = {
	getSupportedLanguages: () =>
		Object.keys(shikiLanguages) as ReturnType<CodeHighlighterPlugin["getSupportedLanguages"]>,
	getThemes: () => themes,
	highlight: ({ code: sourceCode, language, themes: activeThemes }, callback) => {
		const supportedLanguage = getSupportedLanguage(language);
		if (!supportedLanguage) {
			return null;
		}

		const themeNames = [getThemeName(activeThemes[0]), getThemeName(activeThemes[1])] as [string, string];
		const tokensCacheKey = getTokensCacheKey(sourceCode, supportedLanguage, themeNames);
		const cached = tokensCache.get(tokensCacheKey);
		if (cached) {
			return cached;
		}

		if (callback) {
			const themeSubscribers = subscribers.get(tokensCacheKey) ?? new Set<(result: HighlightResult) => void>();
			themeSubscribers.add(callback);
			subscribers.set(tokensCacheKey, themeSubscribers);
		}

		getHighlighter(supportedLanguage)
			.then((highlighter) => {
				const result = highlighter.codeToTokens(sourceCode, {
					lang: supportedLanguage,
					themes: {
						dark: themeNames[1],
						light: themeNames[0],
					},
				});
				tokensCache.set(tokensCacheKey, result);

				const tokenSubscribers = subscribers.get(tokensCacheKey);
				if (tokenSubscribers) {
					for (const subscriber of tokenSubscribers) {
						subscriber(result);
					}
					subscribers.delete(tokensCacheKey);
				}
			})
			.catch((error) => {
				console.error("[Streamdown Code] Failed to highlight code:", error);
				subscribers.delete(tokensCacheKey);
			});

		return null;
	},
	name: "shiki",
	supportsLanguage: (language) => getSupportedLanguage(language) !== null,
	type: "code-highlighter",
};
