// Empty state — friendly placeholder with optional icon and CTA
export const EmptyState = ({ icon = "📭", title, description, action }) => (
  <div
    style={{
      padding: "48px 24px",
      textAlign: "center",
      color: "var(--text-muted, #6b7280)",
    }}
  >
    <div style={{ fontSize: "3rem", marginBottom: "12px" }} aria-hidden="true">
      {icon}
    </div>
    <h3 style={{ margin: "0 0 8px", color: "var(--text, #111)" }}>{title}</h3>
    {description && <p style={{ margin: "0 0 16px", maxWidth: "400px", marginInline: "auto" }}>{description}</p>}
    {action}
  </div>
);

export default EmptyState;
