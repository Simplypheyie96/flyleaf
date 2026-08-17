import styles from "./ThoughtClusters.module.css";
import PaperSurface from "../../../components/PaperSurface";

export default function ThoughtClusters() {
  return (
    <section className={styles.clusterSection} aria-labelledby="thought-cluster-title">
      <h2 id="thought-cluster-title" className={styles.tab}>Threaded Thoughts</h2>
      <p className={styles.subtitle}>On Solitude & Silence</p>
      
      <div className={styles.cluster}>
        <div className={styles.thread} />
        
        <PaperSurface className={styles.note} rotate={-1}>
          <p className={styles.quote}>"I was never less alone than when by myself."</p>
          <p className={styles.source}>— Walden</p>
        </PaperSurface>
        
        <PaperSurface className={styles.note} rotate={1.5}>
          <p className={styles.quote}>"All of humanity's problems stem from man's inability to sit quietly in a room alone."</p>
          <p className={styles.source}>— Pensées</p>
        </PaperSurface>
        
        <div className={styles.knot} />
      </div>
    </section>
  );
}
