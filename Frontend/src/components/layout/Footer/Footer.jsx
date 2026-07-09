import styles from "./Footer.module.css";

function Footer() {
  return (
    <footer className={`${styles.footer} align-items-center d-flex justify-content-center`}>
      <span>{new Date().getFullYear()} © IT Ticketing System</span>
    </footer>
  );
}

export default Footer;
