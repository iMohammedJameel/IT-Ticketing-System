/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Unit tests for the auth validation schemas.
import { describe, it, expect } from "vitest";
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  updateProfileSchema,
} from "../../controller/validation/authvalidation";

describe("registerSchema", () => {
  it("accepts a valid payload", () => {
    const { error, value } = registerSchema.validate(
      { name: "Alice", email: "alice@example.com", password: "StrongPass1" },
      { abortEarly: false, stripUnknown: true }
    );
    expect(error).toBeUndefined();
    expect(value.name).toBe("Alice");
    expect(value.email).toBe("alice@example.com");
  });

  it("rejects a too-short name", () => {
    const { error } = registerSchema.validate(
      { name: "Al", email: "alice@example.com", password: "StrongPass1" },
      { abortEarly: false }
    );
    expect(error).toBeDefined();
  });

  it("rejects an invalid email", () => {
    const { error } = registerSchema.validate(
      { name: "Alice", email: "not-an-email", password: "StrongPass1" },
      { abortEarly: false }
    );
    expect(error).toBeDefined();
  });

  it("accepts a non-IANA TLD email like qa@company.test (BUG-qa7-9: HTML5 accepts it, Joi must too)", () => {
    const { error } = registerSchema.validate(
      { name: "Alice", email: "qa@company.test", password: "StrongPass1" },
      { abortEarly: false }
    );
    expect(error).toBeUndefined();
  });

  it("rejects a password shorter than 8 chars", () => {
    const { error } = registerSchema.validate(
      { name: "Alice", email: "alice@example.com", password: "Short1" },
      { abortEarly: false }
    );
    expect(error).toBeDefined();
  });

  it("accepts a lowercase + digit password (policy aligned with seeded creds like password123)", () => {
    // The old policy required an uppercase letter, which made it impossible
    // to set/revert to the seeded credentials through the API.
    const { error } = registerSchema.validate(
      { name: "Alice", email: "alice@example.com", password: "alllowercase1" },
      { abortEarly: false }
    );
    expect(error).toBeUndefined();
  });

  it("rejects a password without a letter", () => {
    const { error } = registerSchema.validate(
      { name: "Alice", email: "alice@example.com", password: "12345678" },
      { abortEarly: false }
    );
    expect(error).toBeDefined();
  });

  it("rejects a password without a digit", () => {
    const { error } = registerSchema.validate(
      { name: "Alice", email: "alice@example.com", password: "NoDigitsHere" },
      { abortEarly: false }
    );
    expect(error).toBeDefined();
  });

  it("strips unknown fields like `role` — prevents privilege escalation", () => {
    const { error, value } = registerSchema.validate(
      { name: "Alice", email: "alice@example.com", password: "StrongPass1", role: "admin" },
      { abortEarly: false, stripUnknown: true }
    );
    expect(error).toBeUndefined();
    expect(value.role).toBeUndefined();
  });
});

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    const { error } = loginSchema.validate(
      { email: "alice@example.com", password: "anything" }
    );
    expect(error).toBeUndefined();
  });

  it("rejects an invalid email", () => {
    const { error } = loginSchema.validate(
      { email: "not-an-email", password: "anything" }
    );
    expect(error).toBeDefined();
  });

  it("does NOT enforce password complexity on login (so we don't reveal rules)", () => {
    const { error } = loginSchema.validate(
      { email: "alice@example.com", password: "a" }
    );
    expect(error).toBeUndefined();
  });
});

describe("changePasswordSchema", () => {
  it("accepts a valid new password", () => {
    const { error } = changePasswordSchema.validate(
      { currentPassword: "old", newPassword: "NewStrongPass1" }
    );
    expect(error).toBeUndefined();
  });

  it("rejects a weak new password", () => {
    const { error } = changePasswordSchema.validate(
      { currentPassword: "old", newPassword: "weak" }
    );
    expect(error).toBeDefined();
  });
});

describe("updateProfileSchema", () => {
  it("accepts a name change", () => {
    const { error } = updateProfileSchema.validate({ name: "New Name" });
    expect(error).toBeUndefined();
  });

  it("accepts an email change", () => {
    const { error } = updateProfileSchema.validate({ email: "new@example.com" });
    expect(error).toBeUndefined();
  });

  it("accepts notificationPrefs with the 5 User-model keys (BUG-qa7-3 fix)", () => {
    const { error, value } = updateProfileSchema.validate({
      notificationPrefs: {
        ticketCreated: false,
        ticketAssigned: true,
        ticketStatusChanged: false,
        ticketCommented: true,
        slaBreaching: true,
      },
    });
    expect(error).toBeUndefined();
    expect(value.notificationPrefs.slaBreaching).toBe(true);
  });

  it("rejects non-boolean notificationPrefs values", () => {
    const { error } = updateProfileSchema.validate({
      notificationPrefs: { ticketCreated: "yes" },
    });
    expect(error).toBeDefined();
  });

  it("accepts job details (jobTitle / department / phone)", () => {
    const { error, value } = updateProfileSchema.validate({
      jobTitle: "Accountant",
      department: "Finance",
      phone: "+20 100 000 0000",
    });
    expect(error).toBeUndefined();
    expect(value.jobTitle).toBe("Accountant");
  });

  it("allows clearing job fields with empty strings", () => {
    const { error } = updateProfileSchema.validate({ jobTitle: "", department: "", phone: "" });
    expect(error).toBeUndefined();
  });

  it("rejects an empty payload (requires at least one field)", () => {
    const { error } = updateProfileSchema.validate({});
    expect(error).toBeDefined();
  });
});
