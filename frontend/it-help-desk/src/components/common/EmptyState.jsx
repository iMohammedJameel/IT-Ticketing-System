/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Empty state — friendly placeholder with icon and optional CTA.
// Icon accepts FontAwesome classes ("fa-solid fa-ticket") for visual
// consistency with the rest of the app; emoji strings still work.
export const EmptyState = ({ icon = "fa-regular fa-inbox", title, description, action }) => {
  const isFa = typeof icon === "string" && icon.startsWith("fa-");
  return (
    <div
      style={{
        padding: "48px 24px",
        textAlign: "center",
        color: "var(--text-muted)",
      }}
    >
      <div
        style={{
          fontSize: "3rem",
          marginBottom: "12px",
          color: "var(--text-muted)",
          opacity: 0.85,
        }}
        aria-hidden="true"
      >
        {isFa ? <i className={icon}></i> : icon}
      </div>
      <h3 style={{ margin: "0 0 8px", color: "var(--text-dark)", fontSize: "1.15rem" }}>{title}</h3>
      {description && (
        <p
          style={{
            margin: "0 0 16px",
            maxWidth: "400px",
            marginInline: "auto",
            color: "var(--text-secondary)",
            fontSize: "0.9rem",
          }}
        >
          {description}
        </p>
      )}
      {action}
    </div>
  );
};

export default EmptyState;
