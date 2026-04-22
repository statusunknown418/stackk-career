import { createFileRoute } from "@tanstack/react-router";
import { createRouteHandler } from "uploadthing/server";
import { uploadRouter } from "@/files/uploadthing";

const handlers = createRouteHandler({ router: uploadRouter, config: { logLevel: "All" } });

export const Route = createFileRoute("/api/uploadthing")({
	server: {
		handlers: {
			POST: handlers,
			GET: handlers,
		},
	},
});
