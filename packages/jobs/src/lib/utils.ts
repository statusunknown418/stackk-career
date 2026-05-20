export const ALLOWED_PDF_HOST_SUFFIXES = [".utfs.io", ".ufs.sh", "utfs.io"];

export function assertPdfHostAllowed(pdfUrl: string): URL {
	const url = new URL(pdfUrl);
	if (url.protocol !== "https:") {
		throw new Error(`Resume PDF must be https. Got: ${url.protocol}`);
	}

	const host = url.hostname.toLowerCase();
	const allowed = ALLOWED_PDF_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(suffix));
	if (!allowed) {
		throw new Error(`Resume PDF host not allowed: ${host}`);
	}
	return url;
}
