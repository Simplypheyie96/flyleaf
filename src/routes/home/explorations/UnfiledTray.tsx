import styles from "./UnfiledTray.module.css";
import PaperSurface from "../../../components/PaperSurface";

export default function UnfiledTray() {
  return (
    <section className={styles.traySection} aria-labelledby="unfiled-tray-title">
      <h2 id="unfiled-tray-title" className={styles.tab}>Unfiled Notes</h2>
      <div className={styles.tray}>
        <PaperSurface className={styles.card} rotate={-2}>
          <div className={styles.orbPlaceholder} />
          <p className={styles.caption}>Voice memo from this morning...</p>
        </PaperSurface>
        
        <PaperSurface className={styles.card} rotate={1.5}>
          <p className={styles.handwritten}>"She looked at the sky and saw only time passing."</p>
          <p className={styles.caption}>Quick capture</p>
        </PaperSurface>
      </div>
      <p className={styles.footer}>Drop quick thoughts here while reading.</p>
    </section>
  );
}
