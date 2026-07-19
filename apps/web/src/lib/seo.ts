export const SITE_URL = "https://assendia.com";
export const SITE_NAME = "ASSENDIA";
export const OG_IMAGE_URL = `${SITE_URL}/og-image.png`;

interface SeoHeadOptions {
	description: string;
	/** Route path with a leading slash ("/score-cv"); "/" for the homepage. */
	path: string;
	/** Full document title, e.g. "Score CV gratis · ASSENDIA". */
	title: string;
}

interface SeoHead {
	links: { rel: string; href: string }[];
	meta: { title?: string; name?: string; property?: string; content?: string }[];
}

/**
 * Builds the shared meta/link set every indexable route needs: title,
 * description, robots, canonical, Open Graph and Twitter cards. Routes spread
 * the result into their `head()` and append page-specific extras after it.
 */
export function seoHead({ title, description, path }: SeoHeadOptions): SeoHead {
	const url = path === "/" ? SITE_URL : `${SITE_URL}${path}`;
	return {
		meta: [
			{ title },
			{ name: "description", content: description },
			{ name: "robots", content: "index, follow" },
			{ property: "og:type", content: "website" },
			{ property: "og:site_name", content: SITE_NAME },
			{ property: "og:title", content: title },
			{ property: "og:description", content: description },
			{ property: "og:url", content: url },
			{ property: "og:image", content: OG_IMAGE_URL },
			{ property: "og:image:width", content: "1200" },
			{ property: "og:image:height", content: "630" },
			{ property: "og:image:alt", content: title },
			{ property: "og:locale", content: "es_PE" },
			{ name: "twitter:card", content: "summary_large_image" },
			{ name: "twitter:title", content: title },
			{ name: "twitter:description", content: description },
			{ name: "twitter:image", content: OG_IMAGE_URL },
			{ name: "twitter:image:alt", content: title },
		],
		links: [{ rel: "canonical", href: url }],
	};
}

/**
 * BreadcrumbList JSON-LD for a subpage one level below the homepage.
 */
export function breadcrumbJsonLd(pageName: string, path: string) {
	return {
		"@type": "BreadcrumbList",
		itemListElement: [
			{ "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
			{ "@type": "ListItem", position: 2, name: pageName, item: `${SITE_URL}${path}` },
		],
	};
}

/**
 * FAQPage JSON-LD from a list of question/answer pairs.
 */
export function faqJsonLd(items: readonly { q: string; a: string }[], id: string) {
	return {
		"@type": "FAQPage",
		"@id": id,
		mainEntity: items.map((item) => ({
			"@type": "Question",
			name: item.q,
			acceptedAnswer: { "@type": "Answer", text: item.a },
		})),
	};
}
