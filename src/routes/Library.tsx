import PaperSurface from '../components/PaperSurface'
import pageStyles from './page.module.css'
import styles from './Stub.module.css'

/* Placeholder until the Library (Stack/Shelf/Grid + search) is built
   later in step 02. */
function Library() {
  return (
    <main className={pageStyles.page}>
      <div className={pageStyles.column}>
        <PaperSurface rotate={-0.8}>
          <div className={styles.card}>
            <h1 className={styles.headline}>The Library is on its way.</h1>
            <p className={styles.body}>
              Your bookshelf — stack, shelf, and grid — arrives in the next
              build step.
            </p>
          </div>
        </PaperSurface>
      </div>
    </main>
  )
}

export default Library
