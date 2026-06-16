import { MachineSession } from "./machine-session";

/**
 * The browser entry point for the static (GitHub Pages) build. esbuild bundles
 * this and the whole domain core into `dist/app.js` — see scripts/build-static.mjs.
 * There is no server here: the machine runs in the page, and each page load starts
 * a fresh session (state lives only in memory, lost on reload — fine for a demo).
 *
 * It exposes exactly the same `window.VM_API` contract the dev adapter does
 * (public/app.js), so index.html's render layer is byte-identical in both modes
 * and never knows which transport it's talking to.
 */

const session = new MachineSession();

(window as any).VM_API = {
  // Mirror the server's response: `{ ...extras, state }` on success, `{ error }`
  // on a bad request — the same shape index.html's post() already branches on.
  async post(action: string, body: unknown) {
    try {
      const result = session.dispatch(action, body ?? {});
      return { ...((result as object) ?? {}), state: session.snapshot() };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "error" };
    }
  },
  async state() {
    return session.snapshot();
  },
};
