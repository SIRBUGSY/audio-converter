/*! coi-serviceworker v0.1.7 - Guido Zuidhof, licensed under MIT */
let coepCredentialless = false;
if (typeof window === 'undefined') {
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

  self.addEventListener("message", (ev) => {
    if (!ev.data) {
      return;
    } else if (ev.data.type === "deregister") {
      self.registration.unregister();
    } else if (ev.data.type === "coepCredentialless") {
      coepCredentialless = ev.data.value;
    }
  });

  self.addEventListener("fetch", function (event) {
    const r = event.request;
    if (r.cache === "only-if-cached" && r.mode !== "same-origin") {
      return;
    }

    const request = (coepCredentialless && r.mode === "no-cors")
      ? new Request(r, {
        credentials: "omit",
      })
      : r;
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 0) {
            return response;
          }

          const newHeaders = new Headers(response.headers);
          newHeaders.set("Cross-Origin-Embedder-Policy",
            coepCredentialless ? "credentialless" : "require-corp"
          );
          if (!newHeaders.get("Cross-Origin-Opener-Policy")) {
            newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
          }

          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });
        })
        .catch((e) => console.error(e))
    );
  });
} else {
  (() => {
    const reloadedBySelf = window.sessionStorage.getItem("coiReloadedBySelf");
    window.sessionStorage.removeItem("coiReloadedBySelf");
    const coepCredentialless = false;

    if (reloadedBySelf) {
      console.log("Coop/Coep enabled by coi-serviceworker");
      return;
    }

    if (!window.isSecureContext) {
      console.log("Coop/Coep cannot be enabled: window.isSecureContext is false");
      return;
    }

    const n = navigator;
    if (n.serviceWorker) {
        n.serviceWorker.register(window.document.currentScript.src).then(
        (registration) => {
            console.log("Coop/Coep service worker registered", registration.scope);

            registration.addEventListener("updatefound", () => {
            console.log("Reloading because there is a new version of the service worker.");
            window.location.reload();
            });

            if (registration.active && !n.serviceWorker.controller) {
            console.log("Reloading because the service worker is active but not controlling the page.");
            window.location.reload();
            }
        },
        (err) => {
            console.error("Coop/Coep service worker failed to register", err);
        }
        );
    }
  })();
}