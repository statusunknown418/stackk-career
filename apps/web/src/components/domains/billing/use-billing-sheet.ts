import { create } from "zustand";

/** Which screen the billing sheet lands on when opened. */
export type BillingSheetView = "overview" | "selector";

interface BillingSheetStore {
	closeBillingSheet: () => void;
	open: boolean;
	openBillingSheet: (view?: BillingSheetView) => void;
	view: BillingSheetView;
}

/**
 * Global open/view state for the single {@link BillingSheet} instance hosted in the dash layout. Any
 * surface can trigger the upgrade flow via `useBillingSheet((s) => s.openBillingSheet)` without prop
 * drilling. Holds UI state only; plan data comes from `orpc.billing.getSnapshot` via react-query.
 */
export const useBillingSheet = create<BillingSheetStore>((set) => ({
	open: false,
	view: "overview",
	openBillingSheet: (view: BillingSheetView = "overview") => set({ open: true, view }),
	closeBillingSheet: () => set({ open: false }),
}));
