import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";

export const getSidebarState = createServerFn({ method: "GET" }).handler(() => ({
	left: getCookie("sidebar_state_left") !== "false",
	right: getCookie("sidebar_state_right") !== "false",
}));
