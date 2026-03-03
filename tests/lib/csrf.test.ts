import { describe, expect, it } from "vitest";

import { assertCsrf } from "@/lib/auth/csrf";

describe("assertCsrf", () => {
  it("allows safe methods", () => {
    const request = new Request("https://app.dev.test/api/incidents", {
      method: "GET",
      headers: {
        origin: "https://evil.example",
        "sec-fetch-site": "cross-site",
      },
    });

    expect(() => assertCsrf(request)).not.toThrow();
  });

  it("rejects unsafe cross-site requests", () => {
    const request = new Request("https://app.dev.test/api/incidents", {
      method: "POST",
      headers: {
        "sec-fetch-site": "cross-site",
      },
    });

    expect(() => assertCsrf(request)).toThrow("CSRF validation failed");
  });

  it("rejects origin mismatch", () => {
    const request = new Request("https://app.dev.test/api/incidents", {
      method: "PATCH",
      headers: {
        origin: "https://other.dev.test",
      },
    });

    expect(() => assertCsrf(request)).toThrow("CSRF validation failed");
  });

  it("allows same-origin mutations", () => {
    const request = new Request("https://app.dev.test/api/incidents", {
      method: "DELETE",
      headers: {
        origin: "https://app.dev.test",
        "sec-fetch-site": "same-origin",
      },
    });

    expect(() => assertCsrf(request)).not.toThrow();
  });
});
