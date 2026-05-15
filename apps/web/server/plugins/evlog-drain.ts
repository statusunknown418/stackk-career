import { definePlugin } from "nitro";
import { drain } from "../utils/axiom-drain";

export default definePlugin((nitroApp) => {
	nitroApp.hooks.hook("evlog:drain", drain);
});
