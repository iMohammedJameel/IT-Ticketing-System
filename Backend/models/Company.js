/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Company — first-class entity for the B2B side of the help desk.
// Previously `Ticket.company` was free text with no directory, so reporting
// per customer was impossible ("KFC" vs "kfc " vs "K.F.C" were three
// different companies). Tickets now carry a `companyId` reference (with the
// text name denormalized for history/audit readability).
const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Company name is required"],
      unique: true,
      trim: true,
      maxlength: 100,
    },
    contactName: { type: String, default: "", trim: true, maxlength: 100 },
    email: { type: String, default: "", trim: true, lowercase: true, maxlength: 200 },
    phone: { type: String, default: "", trim: true, maxlength: 40 },
    notes: { type: String, default: "", trim: true, maxlength: 2000 },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

const Company = mongoose.models.Company || mongoose.model("Company", companySchema);
module.exports = Company;
