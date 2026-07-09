// Dashboard shell — uses AuthContext, lazy-loaded child routes for code splitting
import { useState, lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Footer from "../../components/layout/Footer/Footer";
import Navbar from "../../components/layout/Navbar/Navbar";
import Sidebar from "../../components/layout/Sidebar/Sidebar";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../../components/common/Spinner";
import styles from "./Dashboard.module.css";

// Lazy load all child pages
const DashboardPage = lazy(() => import("./DashboardPage"));
const Tickets = lazy(() => import("../Tickets/Tickets"));
const TicketsList = lazy(() => import("../TicketsList/TicketsList"));
const Settings = lazy(() => import("../Settings/Settings"));
const Users = lazy(() => import("../Users/Users"));
const KnowledgeBase = lazy(() => import("../KnowledgeBase/KnowledgeBase"));
const NotificationsPage = lazy(() => import("../Notifications/Notifications"));

function Dashboard() {
  const { isAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={styles.appLayout}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={styles.rightSide}>
        <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        {sidebarOpen && (
          <div
            className={styles.overlay}
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        <main className={styles.main}>
          <Suspense
            fallback={
              <div
                style={{
                  minHeight: "60vh",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Spinner size="lg" />
              </div>
            }
          >
            <Routes>
              {isAdmin && <Route path="/dashboard" element={<DashboardPage />} />}
              {isAdmin && <Route path="/users" element={<Users />} />}
              <Route path="/tickets" element={<Tickets />} />
              <Route path="/ticketslist" element={<TicketsList />} />
              <Route path="/kb" element={<KnowledgeBase />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/settings" element={<Settings />} />
              <Route
                path="/"
                element={<Navigate to={isAdmin ? "/dashboard" : "/tickets"} replace />}
              />
              <Route path="*" element={<Navigate to={isAdmin ? "/dashboard" : "/tickets"} replace />} />
            </Routes>
          </Suspense>
        </main>

        <Footer />
      </div>
    </div>
  );
}

export default Dashboard;
