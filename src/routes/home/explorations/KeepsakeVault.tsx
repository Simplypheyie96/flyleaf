import styles from "./KeepsakeVault.module.css";
import BookCover from "../../../components/BookCover";
import { coversOf } from "../../../books/covers";
import type { Book } from "../../../data/db";

// Hardcode mock finished books for this preview
const MOCK_FINISHED_BOOKS: Book[] = [
  {
    id: 1,
    title: "Dune",
    author: "Frank Herbert",
    source: "demo",
    startedOn: new Date().toISOString(),
    finishedOn: new Date().toISOString(),
    // @ts-ignore
    covers: { hue: 20 },
  },
  {
    id: 2,
    title: "Piranesi",
    author: "Susanna Clarke",
    source: "demo",
    startedOn: new Date().toISOString(),
    finishedOn: new Date().toISOString(),
    // @ts-ignore
    covers: { hue: 195 },
  }
];

export default function KeepsakeVault() {
  return (
    <section className={styles.vaultSection} aria-labelledby="vault-title">
      <h2 id="vault-title" className={styles.tab}>Finished Keepsakes</h2>
      
      <div className={styles.shelf}>
        {MOCK_FINISHED_BOOKS.map(book => (
          <div key={book.id} className={styles.volume}>
            <div className={styles.ribbonWrapper}>
              <div className={styles.ribbon} />
              <div className={styles.seal} />
            </div>
            <BookCover 
              title={book.title} 
              author={book.author} 
              covers={coversOf(book)} 
              width={100}
              rotate={0}
            />
            <div className={styles.stats}>
              <span>Finished Oct 12</span>
              <span>14 quotes</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
