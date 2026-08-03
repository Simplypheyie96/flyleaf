import Avatar from '../journey/avatars'
import styles from './FaceLab.module.css'

/* A contact sheet for the one drawing in the app that has to come out
   different every time.

   The character card shows a face per name, and the only honest way to check
   that generator is to look at a crowd of them at the size they are actually
   used. Two sample characters cannot tell you whether the pen repeats itself —
   the first time this was checked against two names they both landed on the
   same haircut, and the drawing looked broken when it was only unlucky.

   Names, not seeds: the seed is derived from the name, so typing numbers here
   would test a function nothing calls. These are the shapes of name a reader
   actually writes — a first name, a title and a name, a description standing
   in for a name they never learned. */
const NAMES = [
  'Aunt Bel',
  'The boy from the ferry',
  'Marek',
  'Marec',
  'Ines',
  'The woman in the blue coat',
  'Father Halloran',
  'Sil',
  'The younger brother',
  'Dr. Aworan',
  'Pim',
  'The lighthouse keeper',
  'Rosalind',
  'Old Tam',
  'The girl who counted',
  'Bettine',
  'Odile',
  'The man with the dogs',
  'Yusuf',
  'Wren',
  'The second cousin',
  'Halla',
  'Constance',
  'The one who left',
]

function FaceLab() {
  return (
    <main className={styles.sheet}>
      <h1 className={styles.title}>Faces</h1>
      <p className={styles.note}>
        Every name draws its own face. {NAMES.length} names, at the size the
        character card uses.
      </p>
      <ul className={styles.grid}>
        {NAMES.map((name) => (
          <li key={name} className={styles.cell}>
            <div className={styles.mount}>
              <Avatar name={name} />
            </div>
            <span className={styles.name}>{name}</span>
          </li>
        ))}
      </ul>
    </main>
  )
}

export default FaceLab
