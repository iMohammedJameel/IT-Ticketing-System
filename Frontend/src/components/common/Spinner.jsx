// Loading spinner — accessible, with optional label
export const Spinner = ({ size = "md", label = "Loading..." }) => {
  const sizes = { sm: "1rem", md: "1.5rem", lg: "2.5rem" };
  return (
    <span
      role="status"
      aria-live="polite"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
      }}
    >
      <span
        className="spinner-border"
        style={{ width: sizes[size], height: sizes[size] }}
        aria-hidden="true"
      />
      {label && <span className="visually-hidden">{label}</span>}
    </span>
  );
};

export default Spinner;
