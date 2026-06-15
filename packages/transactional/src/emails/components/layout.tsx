import {
	Body,
	Column,
	Container,
	Head,
	Hr,
	Html,
	Img,
	Link,
	Preview,
	Row,
	Section,
	Text,
} from "@react-email/components";
import type { CSSProperties, ReactNode } from "react";

const BRAND = "Assendia";

/**
 * Hosted on the public marketing site (same asset the site uses for its OG/org
 * logo). Kept as an absolute URL — NOT `appUrl`/`CORS_ORIGIN`, which is the app
 * origin (e.g. `localhost:3001` in dev) and is unreachable by mail clients.
 */
const LOGO_URL = "https://assendia.com/assendia-logo.png";

const main: CSSProperties = {
	backgroundColor: "#f6f7f9",
	fontFamily:
		"-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'",
	margin: 0,
	padding: 0,
};

const container: CSSProperties = {
	backgroundColor: "#ffffff",
	border: "1px solid #ececec",
	borderRadius: "12px",
	margin: "32px auto",
	maxWidth: "520px",
	padding: "40px",
};

const brand: CSSProperties = {
	color: "#111827",
	fontSize: "18px",
	fontWeight: 400,
	letterSpacing: "-0.01em",
	margin: 0,
};

const logo: CSSProperties = {
	borderRadius: "8px",
	display: "block",
};

const logoCell: CSSProperties = {
	verticalAlign: "middle",
	width: "48px",
};

const brandCell: CSSProperties = {
	paddingLeft: "12px",
	verticalAlign: "middle",
};

const divider: CSSProperties = {
	borderColor: "#ececec",
	margin: "28px 0",
};

const footerText: CSSProperties = {
	color: "#9ca3af",
	fontSize: "12px",
	lineHeight: "18px",
	margin: 0,
};

const footerLink: CSSProperties = {
	color: "#6b7280",
	textDecoration: "underline",
};

interface EmailLayoutProps {
	appUrl: string;
	children: ReactNode;
	preview: string;
}

/**
 * Shell shared by every transactional email: branded header, content slot, and
 * footer. Hierarchy comes from size/color only — no bold weights — per the repo
 * UI guideline.
 */
export function EmailLayout({ preview, appUrl, children }: EmailLayoutProps) {
	return (
		<Html lang="es">
			<Head />
			<Preview>{preview}</Preview>
			<Body style={main}>
				<Container style={container}>
					<Section>
						<Row>
							<Column style={logoCell}>
								<Img alt={BRAND} height={40} src={LOGO_URL} style={logo} width={40} />
							</Column>
							<Column style={brandCell}>
								<Text style={brand}>{BRAND}</Text>
							</Column>
						</Row>
					</Section>
					<Hr style={divider} />
					{children}
					<Hr style={divider} />
					<Section>
						<Text style={footerText}>
							Recibiste este correo porque tienes una cuenta en {BRAND}.{" "}
							<Link href={appUrl} style={footerLink}>
								Ir a la app
							</Link>
							.
						</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	);
}
