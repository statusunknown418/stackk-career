const registry = new Map<number, string>();

export const getBlockKey = (blockId: number): string => {
	const existing = registry.get(blockId);
	if (existing) {
		return existing;
	}
	const key = crypto.randomUUID();
	registry.set(blockId, key);
	return key;
};

export const migrateBlockKey = (fromId: number, toId: number): void => {
	if (fromId === toId) {
		return;
	}
	const key = registry.get(fromId);
	if (!key) {
		return;
	}
	registry.delete(fromId);
	if (!registry.has(toId)) {
		registry.set(toId, key);
	}
};

export const releaseBlockKey = (blockId: number): void => {
	registry.delete(blockId);
};
