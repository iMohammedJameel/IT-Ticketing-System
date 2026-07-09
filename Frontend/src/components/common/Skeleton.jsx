// Skeleton loader — for placeholder content while data loads
export const Skeleton = ({ width = "100%", height = "1rem", rounded = true, style = {} }) => (
  <div
    className="skeleton"
    aria-hidden="true"
    style={{
      width,
      height,
      borderRadius: rounded ? "4px" : "0",
      ...style,
    }}
  />
);

export const SkeletonText = ({ lines = 3, lineHeight = "0.875rem", gap = "8px" }) => (
  <div style={{ display: "flex", flexDirection: "column", gap }}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        height={lineHeight}
        width={i === lines - 1 ? "60%" : "100%"}
      />
    ))}
  </div>
);

export const SkeletonCard = () => (
  <div
    style={{
      padding: "16px",
      border: "1px solid var(--border, #e5e7eb)",
      borderRadius: "8px",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
    }}
  >
    <Skeleton height="1.5rem" width="50%" />
    <SkeletonText lines={3} />
  </div>
);

export default Skeleton;
