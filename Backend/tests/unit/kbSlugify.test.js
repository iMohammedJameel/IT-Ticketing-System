/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Unit tests for the KB slugify — specifically the unicode/Arabic fix
// (BUG-qa8-1: \w stripped Arabic → every Arabic title collapsed to "-" and
// collided, capping the Arabic KB at one article forever).
import { describe, it, expect } from "vitest";
import { slugify } from "../../controller/kbController";

describe("kbController.slugify", () => {
  it("slugifies English titles as before", () => {
    expect(slugify("Printer Troubleshooting Guide")).toBe("printer-troubleshooting-guide");
  });

  it("keeps Arabic letters and digits — no more \"-\" collapse", () => {
    expect(slugify("كيفية إعادة تعيين كلمة المرور")).toBe("كيفية-إعادة-تعيين-كلمة-المرور");
    expect(slugify("حل مشاكل الاتصال بالشبكة")).toBe("حل-مشاكل-الاتصال-بالشبكة");
  });

  it("produces DIFFERENT slugs for different Arabic titles (the 409 bug)", () => {
    const a = slugify("كيفية إعادة تعيين كلمة المرور");
    const b = slugify("حل مشاكل الاتصال بالشبكة");
    expect(a).not.toBe(b);
    expect(a).not.toBe("-");
    expect(b).not.toBe("-");
  });

  it("mixes scripts, strips punctuation, collapses dashes", () => {
    expect(slugify("VPN & Firewall — الإعدادات 2026")).toBe("vpn-firewall-الإعدادات-2026");
  });

  it("lowercases latin but never mangles Arabic", () => {
    expect(slugify("Email Setup ON Mobile")).toBe("email-setup-on-mobile");
    expect(slugify("طلب صلاحيات جديدة")).toBe("طلب-صلاحيات-جديدة");
  });

  it("trims leading/trailing and collapses repeated dashes", () => {
    expect(slugify("  --Hello   World--  ")).toBe("hello-world");
  });

  it("returns an empty string for punctuation-only titles (controller 400s)", () => {
    expect(slugify("!!! ... ???")).toBe("");
  });
});
