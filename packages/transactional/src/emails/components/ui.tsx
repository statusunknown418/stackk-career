import { Button } from "@react-email/components";
import type { CSSProperties, ReactNode } from "react";

export const heading: CSSProperties = {
	color: "#111827",
	fontSize: "24px",
	fontWeight: 400,
	letterSpacing: "-0.02em",
	lineHeight: "32px",
	margin: "0 0 16px",
};

export const paragraph: CSSProperties = {
	color: "#4b5563",
	fontSize: "15px",
	lineHeight: "24px",
	margin: "0 0 16px",
};

const button: CSSProperties = {
	backgroundColor: "#111827",
	borderRadius: "8px",
	color: "#ffffff",
	display: "inline-block",
	fontSize: "15px",
	fontWeight: 400,
	padding: "12px 24px",
	textDecoration: "none",
};

interface CtaButtonProps {
	children: ReactNode;
	href: string;
}

export function CtaButton({ href, children }: CtaButtonProps) {
	return (
		<Button href={href} style={button}>
			{children}
		</Button>
	);
}
