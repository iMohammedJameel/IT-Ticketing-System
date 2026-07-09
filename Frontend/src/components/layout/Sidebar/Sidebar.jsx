// Sidebar — uses AuthContext (no localStorage), removed duplicate logout (Navbar handles it),
// removed dead social links, added Knowledge Base nav link, dynamic key
import { NavLink } from "react-router-dom";
import Logo from "../../../assets/logo1.png";
import { useAuth } from "../../../context/AuthContext";
import styles from "./Sidebar.module.css";

function Sidebar({ isOpen, onClose }) {
  const { user, isAdmin } = useAuth();

  const links = [
    { icon: "fa-table-cells-large", title: "Dashboard", path: "/dashboard", adminOnly: true },
    { icon: "fa-users", title: "Users", path: "/users", adminOnly: true },
    { icon: "fa-ticket", title: "New Ticket", path: "/tickets" },
    { icon: "fa-list", title: "Tickets List", path: "/ticketslist" },
    { icon: "fa-book", title: "Knowledge Base", path: "/kb" },
    { icon: "fa-gear", title: "Settings", path: "/settings" },
  ];

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.open : ""}`} aria-label="Main navigation">
      <div className={styles.logo}>
        <div className={styles.logoCircle}>
          <img src={Logo} alt="" />
        </div>
        <span className={styles.logoText}>IT Ticketing</span>
      </div>

      <nav>
        {links
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => (
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ""}`
              }
              key={item.path}
              onClick={onClose}
            >
              <i className={`fa-solid ${item.icon}`} aria-hidden="true"></i>
              <span>{item.title}</span>
            </NavLink>
          ))}
      </nav>

      <div className={styles.sidebarBottom}>
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center", margin: 0 }}>
          Signed in as<br />
          <strong>{user?.name || "User"}</strong>
          <br />
          <small>{isAdmin ? "Administrator" : "Employee"}</small>
        </p>
      </div>
    </aside>
  );
}

export default Sidebar;
