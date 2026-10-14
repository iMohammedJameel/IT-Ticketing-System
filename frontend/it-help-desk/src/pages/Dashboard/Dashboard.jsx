/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Dashboard shell — layout + role-aware routes + global shortcuts + palette.
// New routes: /tickets/:id (real ticket page), /queue (agent queue),
// /home (employee home).
import { useState, useEffect, lazy, Suspense, useCallback } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Footer from "../../components/layout/Footer/Footer";
import Navbar from "../../components/layout/Navbar/Navbar";
import Sidebar from "../../components/layout/Sidebar/Sidebar";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../i18n";
import { Spinner } from "../../components/common/Spinner";
import { CommandPalette } from "../../components/common/CommandPalette";
import VerifyBanner from "../../components/common/VerifyBanner";
import useGlobalShortcuts from "../../hooks/useGlobalShortcuts";
import BgWatermark from "../../assets/bg-header-watermark.png";
import BgSkyline from "../../assets/bg-skyline.png";
import styles from "./Dashboard.module.css";

// Lazy load all child pages
const DashboardPage = lazy(() => import("./DashboardPage"));
const ReportsPage = lazy(() => import("./ReportsPage"));
const Tickets = lazy(() => import("../Tickets/Tickets"));
const TicketsList = lazy(() => import("../TicketsList/TicketsList"));
const TicketDetailPage = lazy(() => import("../TicketsList/TicketDetailPage"));
const AgentQueue = lazy(() => import("../AgentQueue/AgentQueue"));
const UserHome = lazy(() => import("../UserHome/UserHome"));
const Settings = lazy(() => import("../Settings/Settings"));
const Users = lazy(() => import("../Users/Users"));
const KnowledgeBase = lazy(() => import("../KnowledgeBase/KnowledgeBase"));
const KBArticlePage = lazy(() => import("../KnowledgeBase/KBArticlePage"));
const NotificationsPage = lazy(() => import("../Notifications/Notifications"));

function Dashboard() {
  const { isAdmin, isStaff } = useAuth();
  const { t } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  useGlobalShortcuts(openPalette);

  // ⌘K hint chip — Safari exposes it as metaKey too
  useEffect(() => {
    const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
    document.documentElement.dataset.platform = isMac ? "mac" : "other";
  }, []);

  return (
    <div className={styles.appLayout}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={styles.rightSide}>
        {/* Reference background artwork — circuit traces + Eye of Horus strip
            (top far corner), the floating Arabic greeting (top-right zone),
            and the Egyptian skyline (bottom). Pure decoration behind content:
            pointer-events none, hidden in dark mode + print. The greeting is
            real text (same Arabic string in both languages — the reference's
            EN layout carries the Arabic accent too), kept inside the art
            layer so pages that use that zone simply draw over it. */}
        <div className={`${styles.bgArt} app-bg-art`} aria-hidden="true">
          <img src={BgWatermark} alt="" className={styles.bgWatermark} />
          <img src={BgSkyline} alt="" className={styles.bgSkyline} />
          <div className={styles.bgGreeting}>
            <p className={styles.greetLine} dir="rtl">{t("nav.greet1")}</p>
            <p className={styles.greetLine} dir="rtl">
              <span className={styles.greetAccent}>{t("nav.greet2")}</span>
            </p>
          </div>
        </div>

        <Navbar
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          onOpenPalette={openPalette}
        />

        {/* Amber banner for unverified users (resend verification link) */}
        <VerifyBanner />

        {sidebarOpen && (
          <div
            className={styles.overlay}
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        <main className={`${styles.main} app-main`}>
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
              {/* Admin-only: analytics + user management + reports */}
              {isAdmin && <Route path="/dashboard" element={<DashboardPage />} />}
              {isAdmin && <Route path="/users" element={<Users />} />}
              {isAdmin && <Route path="/reports" element={<ReportsPage />} />}
              {/* Staff-only: personal queue */}
              {isStaff && <Route path="/queue" element={<AgentQueue />} />}
              {/* Employee home */}
              {!isStaff && <Route path="/home" element={<UserHome />} />}
              {/* Everyone: tickets + KB + notifications + settings */}
              <Route path="/tickets" element={<Tickets />} />
              <Route path="/ticketslist" element={<TicketsList />} />
              {/* Real ticket page — shareable URL, back button works */}
              <Route path="/tickets/:id" element={<TicketDetailPage />} />
              <Route path="/kb" element={<KnowledgeBase />} />
              {/* KB article detail — shareable URL, vote UI */}
              <Route path="/kb/:id" element={<KBArticlePage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/settings" element={<Settings />} />
              {/* Role-aware landing */}
              <Route
                path="/"
                element={
                  <Navigate
                    to={isAdmin ? "/dashboard" : isStaff ? "/queue" : "/home"}
                    replace
                  />
                }
              />
              <Route
                path="*"
                element={
                  <Navigate
                    to={isAdmin ? "/dashboard" : isStaff ? "/queue" : "/home"}
                    replace
                  />
                }
              />
            </Routes>
          </Suspense>
        </main>

        <Footer />
      </div>

      {/* Global command palette (⌘K / Ctrl+K / "/") — mounted only while open */}
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
    </div>
  );
}

export default Dashboard;
