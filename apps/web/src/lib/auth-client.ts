import { sentinelClient } from "@better-auth/infra/client";
import type { auth } from "@stackk-career/auth";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	plugins: [sentinelClient(), inferAdditionalFields<typeof auth>()],
});
