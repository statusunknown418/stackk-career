import { z } from "zod";

export const linkFileInputSchema = z.object({
	userId: z.string().nonempty(),
	url: z.string().nonempty(),
	storageId: z.string().nullable(),
});

export type LinkFileInput = z.infer<typeof linkFileInputSchema>;
