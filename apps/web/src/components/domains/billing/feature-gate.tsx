import { hasFeatureAccess, type LimitKey } from "@stackk-career/schemas/subscriptions";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import type * as React from "react";
import { orpc } from "@/utils/orpc";
import { UpgradePanel } from "./upgrade-panel";

interface FeatureGateProps {
	children: React.ReactNode;
	description?: React.ReactNode;
	/** Entitlement-driven lock: gated when the plan grants `0` of this limit. */
	limitKey?: LimitKey;
	/** Placeholder mode for surfaces with no real content to blur (e.g. unbuilt routes). */
	placeholder?: boolean;
	/** Plan-tier lock for premium-only surfaces without a dedicated entitlement key. */
	requiresPaid?: boolean;
	title?: string;
}

export function FeatureGate({
	children,
	description,
	limitKey,
	placeholder = false,
	requiresPaid = false,
	title,
}: FeatureGateProps): React.ReactElement {
	const { data: snapshot } = useQuery(orpc.billing.getSnapshot.queryOptions());
	const reduceMotion = useReducedMotion();

	let locked = false;
	if (limitKey) {
		locked = snapshot != null && !hasFeatureAccess(snapshot.entitlements[limitKey]);
	} else if (requiresPaid) {
		locked = snapshot != null && snapshot.effectivePlan.id === "free";
	}

	if (!locked) {
		return <>{children}</>;
	}

	const panel = (
		<motion.div
			animate={{ opacity: 1, scale: 1, y: 0 }}
			className="w-full max-w-md"
			initial={reduceMotion ? false : { opacity: 0, scale: 0.9, y: 8 }}
			transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
		>
			<UpgradePanel description={description} title={title} variant="card" />
		</motion.div>
	);

	if (placeholder) {
		return <div className="grid min-h-[60svh] place-items-center p-4">{panel}</div>;
	}

	return (
		<div className="relative isolate">
			<div aria-hidden className="pointer-events-none select-none blur" inert>
				{children}
			</div>

			<div className="absolute inset-0 grid place-items-center bg-background/70 p-4">{panel}</div>
		</div>
	);
}
