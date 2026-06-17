import { create } from "zustand";

interface ProfileSheetStore {
	closeProfileSheet: () => void;
	open: boolean;
	openProfileSheet: () => void;
}

/**
 * Global open state for the single {@link ProfileSheet} instance hosted in the dash layout. Any
 * surface can open the account panel via `useProfileSheet((s) => s.openProfileSheet)` without prop
 * drilling. Holds UI state only; user data comes from `authClient.useSession`.
 */
export const useProfileSheet = create<ProfileSheetStore>((set) => ({
	open: false,
	openProfileSheet: () => set({ open: true }),
	closeProfileSheet: () => set({ open: false }),
}));
