// Unit tests for the ticket validation schemas.
import { describe, it, expect } from "vitest";
import {
  createTicketSchema,
  updateTicketSchema,
  updateStatusSchema,
  updatePrioritySchema,
  assignSchema,
  ticketQuerySchema,
  commentSchema,
  TICKET_STATUSES,
  TICKET_PRIORITIES,
  TICKET_CATEGORIES,
} from "../../controller/validation/TicketValidation";

describe("createTicketSchema", () => {
  const validPayload = {
    product: "E-Invoice",
    company: "Burger King",
    category: "software",
    priority: "high",
    description: "Cannot generate PDF invoices",
  };

  it("accepts a valid payload", () => {
    const { error, value } = createTicketSchema.validate(validPayload, {
      abortEarly: false,
      stripUnknown: true,
    });
    expect(error).toBeUndefined();
    expect(value.product).toBe("E-Invoice");
    expect(value.priority).toBe("high");
  });

  it("defaults category to 'other' and priority to 'medium' if absent", () => {
    const { error, value } = createTicketSchema.validate(
      { product: "E-Invoice", company: "Burger King", description: "Something broke" },
      { abortEarly: false, stripUnknown: true }
    );
    expect(error).toBeUndefined();
    expect(value.category).toBe("other");
    expect(value.priority).toBe("medium");
  });

  it("does NOT require `employee` — the server sets it from the JWT", () => {
    const { error } = createTicketSchema.validate(
      { product: "E-Invoice", company: "Burger King", description: "Something broke" },
      { abortEarly: false, stripUnknown: true }
    );
    expect(error).toBeUndefined();
  });

  it("does NOT require `startDate` — the server defaults it to now", () => {
    const { error, value } = createTicketSchema.validate(
      { product: "E-Invoice", company: "Burger King", description: "Something broke" },
      { abortEarly: false, stripUnknown: true }
    );
    expect(error).toBeUndefined();
    expect(value.startDate).toBeInstanceOf(Date);
  });

  it("rejects an invalid category", () => {
    const { error } = createTicketSchema.validate(
      { ...validPayload, category: "not-a-real-category" },
      { abortEarly: false }
    );
    expect(error).toBeDefined();
  });

  it("rejects an invalid priority", () => {
    const { error } = createTicketSchema.validate(
      { ...validPayload, priority: "instant" },
      { abortEarly: false }
    );
    expect(error).toBeDefined();
  });

  it("rejects a description shorter than 5 chars", () => {
    const { error } = createTicketSchema.validate(
      { ...validPayload, description: "abc" },
      { abortEarly: false }
    );
    expect(error).toBeDefined();
  });
});

describe("updateTicketSchema", () => {
  it("accepts a partial update", () => {
    const { error } = updateTicketSchema.validate({ product: "New Product" });
    expect(error).toBeUndefined();
  });

  it("rejects an empty payload", () => {
    const { error } = updateTicketSchema.validate({});
    expect(error).toBeDefined();
  });

  it("does NOT allow `priority` — that goes through updateTicketPriority (it's stripped, leaving an empty object → validation fails)", () => {
    const { error, value } = updateTicketSchema.validate(
      { priority: "urgent" },
      { abortEarly: false, stripUnknown: true }
    );
    // stripUnknown removes `priority`, leaving an empty object, which fails the .min(1) rule.
    // This is the intended behaviour — forces the caller to use PATCH /tickets/:id/priority.
    expect(error).toBeDefined();
    expect(value.priority).toBeUndefined();
  });
});

describe("updateStatusSchema", () => {
  it("accepts a valid status", () => {
    const { error } = updateStatusSchema.validate({ status: "resolved" });
    expect(error).toBeUndefined();
  });

  it("rejects an invalid status", () => {
    const { error } = updateStatusSchema.validate({ status: "done" });
    expect(error).toBeDefined();
  });

  it("accepts an optional adminNote", () => {
    const { error, value } = updateStatusSchema.validate({
      status: "closed",
      adminNote: "Customer confirmed fix",
    });
    expect(error).toBeUndefined();
    expect(value.adminNote).toBe("Customer confirmed fix");
  });
});

describe("updatePrioritySchema", () => {
  it("accepts a valid priority", () => {
    const { error } = updatePrioritySchema.validate({ priority: "urgent" });
    expect(error).toBeUndefined();
  });

  it("rejects an invalid priority", () => {
    const { error } = updatePrioritySchema.validate({ priority: "instant" });
    expect(error).toBeDefined();
  });
});

describe("assignSchema", () => {
  it("accepts a valid ObjectId string", () => {
    const { error } = assignSchema.validate({ assignedTo: "507f1f77bcf86cd799439011" });
    expect(error).toBeUndefined();
  });

  it("rejects a non-ObjectId string", () => {
    const { error } = assignSchema.validate({ assignedTo: "not-an-id" });
    expect(error).toBeDefined();
  });
});

describe("ticketQuerySchema", () => {
  it("applies sensible defaults for page/limit/sort/order", () => {
    const { error, value } = ticketQuerySchema.validate({});
    expect(error).toBeUndefined();
    expect(value.page).toBe(1);
    expect(value.limit).toBe(20);
    expect(value.sort).toBe("createdAt");
    expect(value.order).toBe("desc");
  });

  it("rejects limit > 100 (caps at 100 to prevent memory blowup)", () => {
    const { error } = ticketQuerySchema.validate({ limit: 99999 });
    expect(error).toBeDefined();
    expect(error.details[0].message).toMatch(/less than or equal to 100/);
  });

  it("accepts limit = 100 (the max)", () => {
    const { error, value } = ticketQuerySchema.validate({ limit: 100 });
    expect(error).toBeUndefined();
    expect(value.limit).toBe(100);
  });

  it("rejects limit=0", () => {
    const { error } = ticketQuerySchema.validate({ limit: 0 });
    expect(error).toBeDefined();
  });

  it("rejects an invalid sort field", () => {
    const { error } = ticketQuerySchema.validate({ sort: "randomField" });
    expect(error).toBeDefined();
  });
});

describe("commentSchema", () => {
  it("accepts a valid comment", () => {
    const { error, value } = commentSchema.validate({ text: "Looks good!" });
    expect(error).toBeUndefined();
    expect(value.isInternal).toBe(false); // defaults to false
  });

  it("accepts an internal flag", () => {
    const { error, value } = commentSchema.validate({
      text: "Admin-only note",
      isInternal: true,
    });
    expect(error).toBeUndefined();
    expect(value.isInternal).toBe(true);
  });

  it("rejects an empty comment", () => {
    const { error } = commentSchema.validate({ text: "   " });
    expect(error).toBeDefined();
  });

  it("rejects a comment longer than 2000 chars", () => {
    const { error } = commentSchema.validate({ text: "x".repeat(2001) });
    expect(error).toBeDefined();
  });
});

describe("constants", () => {
  it("TICKET_STATUSES matches the model enum", () => {
    expect(TICKET_STATUSES).toEqual(["open", "in-progress", "resolved", "closed"]);
  });

  it("TICKET_PRIORITIES matches the model enum", () => {
    expect(TICKET_PRIORITIES).toEqual(["low", "medium", "high", "urgent"]);
  });

  it("TICKET_CATEGORIES matches the model enum", () => {
    expect(TICKET_CATEGORIES).toEqual(["hardware", "software", "network", "access", "other"]);
  });
});
