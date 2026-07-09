// Unit tests for the email service's escapeHtml helper.
// Without this escaping, a ticket description like `<img src=x onerror=alert(1)>`
// would be injected into the HTML email body — enabling stored XSS in email clients.
import { describe, it, expect } from "vitest";
import { escapeHtml } from "../../services/emailService";

describe("escapeHtml", () => {
  it("escapes < and >", () => {
    expect(escapeHtml("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;"
    );
  });

  it("escapes & first (so it doesn't double-encode already-escaped entities)", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
    expect(escapeHtml("&lt;")).toBe("&amp;lt;"); // & becomes &amp; first
  });

  it("escapes double quotes", () => {
    expect(escapeHtml('say "hi"')).toBe("say &quot;hi&quot;");
  });

  it("escapes single quotes", () => {
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });

  it("returns empty string for null/undefined", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });

  it("converts non-string inputs to string before escaping", () => {
    expect(escapeHtml(42)).toBe("42");
    expect(escapeHtml({ a: 1 })).toBe("[object Object]");
  });

  it("neutrifies an XSS payload — escapes angle brackets so the <img> tag is rendered as text, not as HTML", () => {
    const malicious = '<img src=x onerror="alert(document.cookie)">';
    const escaped = escapeHtml(malicious);
    // The angle brackets are escaped so the browser sees literal text, not a tag.
    // Without the leading "<", "onerror" cannot be parsed as an HTML attribute.
    expect(escaped).not.toContain("<img");
    expect(escaped).not.toContain(">");
    expect(escaped.startsWith("&lt;img")).toBe(true);
    // Quotes are also escaped so the onerror payload can't be reconstructed as a JS string
    expect(escaped).toContain("&quot;");
    expect(escaped).toBe(
      "&lt;img src=x onerror=&quot;alert(document.cookie)&quot;&gt;"
    );
  });
});
