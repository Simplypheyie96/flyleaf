import styles from "./MemoryCapsule.module.css";
import PaperSurface from "../../../components/PaperSurface";

export default function MemoryCapsule() {
  return (
    <section className={styles.capsuleSection} aria-labelledby="memory-capsule-title">
      <h2 id="memory-capsule-title" className={styles.tab}>On this page...</h2>
      
      <div className={styles.wrapper}>
        <PaperSurface className={styles.card} rotate={0.5}>
          <div className={styles.dateStamp}>Exactly 1 year ago</div>
          
          <div className={styles.content}>
            <p className={styles.quote}>
              "A story is a letter that the author writes to himself, to tell himself things that he would be unable to discover otherwise."
            </p>
            <p className={styles.source}>— The Shadow of the Wind</p>
          </div>
          
          <div className={styles.peelHint}>
            <span className={styles.hintText}>Swipe to flip</span>
            <div className={styles.cornerPeel} />
          </div>
        </PaperSurface>
      </div>
    </section>
  );
}
