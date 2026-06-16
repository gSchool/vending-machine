// HTTP transport for the dev server (`npm start`). It forwards each UI action to
// the matching /api/ endpoint in src/server.ts and returns the JSON the server
// sends back. The static build (npm run build:static) overwrites this file in
// dist/ with a bundle that talks to the domain core in-process instead — see
// src/web-app.ts. Either way, index.html only ever touches window.VM_API.
window.VM_API = {
  async post(action, body) {
    const res = await fetch("/api/" + action, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    // The server signals failure with an `error` field, not just HTTP status,
    // so the caller can branch on the body alone (matching the static adapter).
    return res.json();
  },
  async state() {
    const res = await fetch("/api/state");
    return res.json();
  },
};
