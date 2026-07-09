// Knowledge base page — public list of articles + search
import { useState } from "react";
import { useAsync } from "../../hooks";
import { kbService } from "../../services/kbService";
import { SkeletonCard } from "../../components/common/Skeleton";
import EmptyState from "../../components/common/EmptyState";
import { toast } from "sonner";

export default function KnowledgeBase() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const { data, loading, reload } = useAsync(
    () => kbService.list({ search, category, limit: 20 }),
    [search, category]
  );

  const articles = data?.data?.articles || [];

  return (
    <div style={{ padding: "24px" }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 style={{ color: "var(--primary)" }}>Knowledge Base</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Browse articles and FAQ to find quick answers
          </p>
        </div>
      </div>

      <div className="d-flex gap-2 mb-4" style={{ flexWrap: "wrap" }}>
        <input
          type="search"
          className="form-control"
          placeholder="Search articles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: "300px" }}
          aria-label="Search knowledge base"
        />
        <select
          className="form-select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{ maxWidth: "180px" }}
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          <option value="hardware">Hardware</option>
          <option value="software">Software</option>
          <option value="network">Network</option>
          <option value="access">Access</option>
          <option value="other">Other</option>
        </select>
      </div>

      {loading ? (
        <div className="row g-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="col-md-6 col-lg-4">
              <SkeletonCard />
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <EmptyState
          icon="📚"
          title="No articles yet"
          description="Knowledge base articles will appear here once published by admins."
        />
      ) : (
        <div className="row g-3">
          {articles.map((a) => (
            <div key={a._id} className="col-md-6 col-lg-4">
              <div
                className="card h-100"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                }}
              >
                <div className="card-body">
                  <span
                    className="badge"
                    style={{
                      background: "var(--bg-input)",
                      color: "var(--text-secondary)",
                      fontSize: "0.7rem",
                      marginBottom: "8px",
                    }}
                  >
                    {a.category}
                  </span>
                  <h5 style={{ color: "var(--primary)", fontSize: "1rem" }}>{a.title}</h5>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "12px" }}>
                    {a.excerpt || a.content?.slice(0, 120)}...
                  </p>
                  <div className="d-flex justify-content-between align-items-center">
                    <small style={{ color: "var(--text-muted)" }}>
                      By {a.author?.name || "Unknown"} · {new Date(a.createdAt).toLocaleDateString()}
                    </small>
                    <small style={{ color: "var(--text-muted)" }}>
                      👁 {a.viewCount} · 👍 {a.helpfulCount}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
