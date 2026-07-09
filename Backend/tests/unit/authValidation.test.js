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

  it("rejects a password shorter than 8 chars", () => {
    const { error } = registerSchema.validate(
      { name: "Alice", email: "alice@example.com", password: "Short1" },
      { abortEarly: false }
    );
    expect(error).toBeDefined();
  });

  it("rejects a password without an uppercase letter", () => {
    const { error } = registerSchema.validate(
      { name: "Alice", email: "alice@example.com", password: "alllowercase1" },
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

  it("rejects an empty payload (requires at least one field)", () => {
    const { error } = updateProfileSchema.validate({});
    expect(error).toBeDefined();
  });
});
