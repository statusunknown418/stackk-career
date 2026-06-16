import type { Icon } from "@phosphor-icons/react";
import { Button, Column, Row, Section, Text } from "@react-email/components";
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

export interface FeatureItem {
	body: string;
	icon: Icon;
	title: string;
}

const featureRow: CSSProperties = {
	margin: "0 0 18px",
};

const featureMarkerCell: CSSProperties = {
	verticalAlign: "top",
	width: "36px",
};

const featureMarker: CSSProperties = {
	backgroundColor: "#f3f4f6",
	borderRadius: "8px",
	display: "inline-block",
	height: "32px",
	lineHeight: "32px",
	textAlign: "center",
	width: "32px",
};

const featureIcon: CSSProperties = {
	verticalAlign: "middle",
};

const featureTitle: CSSProperties = {
	color: "#111827",
	fontSize: "15px",
	lineHeight: "22px",
	margin: "0 0 2px",
};

const featureBody: CSSProperties = {
	color: "#4b5563",
	fontSize: "14px",
	lineHeight: "21px",
	margin: 0,
};

/**
 * Feature list. Each row pairs a Phosphor icon in a neutral badge with a title
 * and supporting line — hierarchy via size/color only, no bold weights, per the
 * repo UI guideline. Rows are keyed by `title`. Note: inline SVG renders in
 * Apple/iOS Mail but is stripped by Gmail, where the badge degrades to empty.
 */
export function FeatureList({ items }: { items: readonly FeatureItem[] }) {
	return (
		<Section>
			{items.map((item) => {
				const FeatureMarkerIcon = item.icon;
				return (
					<Row key={item.title} style={featureRow}>
						<Column style={featureMarkerCell}>
							<span style={featureMarker}>
								<FeatureMarkerIcon color="#111827" size={18} style={featureIcon} weight="regular" />
							</span>
						</Column>
						<Column>
							<Text style={featureTitle}>{item.title}</Text>
							<Text style={featureBody}>{item.body}</Text>
						</Column>
					</Row>
				);
			})}
		</Section>
	);
}
