// Email service — uses nodemailer. In development it logs to console instead of sending.
// In production, configure SMTP via env vars.
const nodemailer = require("nodemailer");
const env = require("../config/env");

// Escape user-supplied content before interpolating into HTML email templates.
// Without this, a ticket description like `<img src=x onerror=alert(1)>` would
// be injected into the email HTML — most clients strip <script> but render
// <img>, <a>, <form> etc., enabling phishing and tracking pixels.
const escapeHtml = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  if (env.isProd && process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Development: use ethereal.email or just log
    transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: "unix",
      buffer: true,
    });
  }
  return transporter;
};

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const t = getTransporter();
    const info = await t.sendMail({
      from: process.env.SMTP_FROM || "IT Ticketing <no-reply@example.com>",
      to,
      subject,
      html,
      text,
    });

    if (!env.isProd) {
      console.log(`📧 [EMAIL] To: ${to} | Subject: ${subject}`);
      if (info.message) console.log("   Preview:", info.message.toString().split("\n").slice(0, 8).join("\n"));
    }
    return info;
  } catch (err) {
    console.error("Email send failed:", err.message);
    // Don't throw — email failure shouldn't break the user flow
    return null;
  }
};

// ---------------------------------------------------------------------
// Templated emails
// ---------------------------------------------------------------------
const sendVerificationEmail = async (user, token) => {
  const verifyUrl = `${env.clientUrl}/verify-email?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: "Verify your email address",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #4A4E8C;">Welcome to IT Ticketing, ${escapeHtml(user.name)}!</h2>
        <p>Please verify your email address by clicking the button below:</p>
        <a href="${escapeHtml(verifyUrl)}" style="display: inline-block; background: #4A4E8C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Verify Email</a>
        <p style="color: #666; font-size: 13px;">Or paste this URL into your browser:<br>${escapeHtml(verifyUrl)}</p>
        <p style="color: #999; font-size: 12px;">This link expires in 24 hours.</p>
      </div>
    `,
    text: `Welcome ${user.name}! Verify your email: ${verifyUrl}`,
  });
};

const sendPasswordResetEmail = async (user, token) => {
  const resetUrl = `${env.clientUrl}/reset-password?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: "Password reset request",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #4A4E8C;">Password Reset</h2>
        <p>Hi ${escapeHtml(user.name)},</p>
        <p>We received a request to reset your password. Click the button below to choose a new one:</p>
        <a href="${escapeHtml(resetUrl)}" style="display: inline-block; background: #4A4E8C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Reset Password</a>
        <p style="color: #666; font-size: 13px;">Or paste this URL into your browser:<br>${escapeHtml(resetUrl)}</p>
        <p style="color: #999; font-size: 12px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>
    `,
    text: `Hi ${user.name}, reset your password: ${resetUrl}`,
  });
};

const sendTicketNotificationEmail = async (user, ticket, type) => {
  const ticketUrl = `${env.clientUrl}/ticketslist?id=${ticket._id}`;
  const subjects = {
    created: `Ticket ${ticket.ticketNumber} created`,
    assigned: `Ticket ${ticket.ticketNumber} assigned to you`,
    status_changed: `Ticket ${ticket.ticketNumber} status updated`,
    commented: `New comment on ticket ${ticket.ticketNumber}`,
    priority_changed: `Ticket ${ticket.ticketNumber} priority changed`,
    sla_breaching: `SLA breaching soon: ticket ${ticket.ticketNumber}`,
    sla_breached: `SLA breached: ticket ${ticket.ticketNumber}`,
  };
  const subject = subjects[type] || "Ticket update";
  await sendEmail({
    to: user.email,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #4A4E8C;">${escapeHtml(subject)}</h2>
        <p>Ticket: <strong>${escapeHtml(ticket.ticketNumber)}</strong></p>
        <p>Product: ${escapeHtml(ticket.product)}</p>
        <p>Description: ${escapeHtml((ticket.description || "").slice(0, 200))}</p>
        <a href="${escapeHtml(ticketUrl)}" style="display: inline-block; background: #4A4E8C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">View Ticket</a>
      </div>
    `,
    text: `${subject}\n\nTicket: ${ticket.ticketNumber}\nView: ${ticketUrl}`,
  });
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendTicketNotificationEmail,
  escapeHtml,
};
