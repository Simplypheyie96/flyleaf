import { useEffect, useState } from 'react'
import Sheet from '../components/Sheet'
import { CloseIcon } from '../components/TabIcons'
import InstallHow from './InstallHow'
import { groupStyles } from './Group'
import { onInstallGuide } from './installable'
import styles from './install.module.css'

/* The same instructions, raised as a sheet.

   This is the route in from the invitation that appears once a reader has a
   book on the shelf — they were reading, not looking for settings, so the
   guide comes to them. In Settings the identical instructions are simply
   printed in the section, where a reader who went looking will find them
   without a second surface opening on top of the first.

   Everything written on it lives in `InstallHow`; this file is the sheet, the
   title and the way out. */

function InstallGuide() {
  const [open, setOpen] = useState(false)

  useEffect(() => onInstallGuide(() => setOpen(true)), [])

  return (
    <Sheet
      open={open}
      onClose={() => setOpen(false)}
      label="How to install Flyleaf"
      name="install-guide"
    >
      <div className={styles.guide}>
        <header className={styles.head}>
          <div className={styles.headLine}>
            <h2 className={styles.title}>Keep Flyleaf on your device</h2>
            {/* The same disc every other sheet closes with. Dragging the sheet
                away is a thumb's route out, not a keyboard's. */}
            <button
              type="button"
              className={styles.close}
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <CloseIcon size={20} />
            </button>
          </div>
          <p className={styles.lede}>
            Its own icon, full screen, works offline. Find your device below.
          </p>
        </header>

        {/* The same rows as the Settings group, so the hairlines between them
            are drawn by the same rule rather than a second copy of it. On the
            sheet the paper is the sheet's own, so the card here is only the
            list — the border and fill are turned off. */}
        <div className={`${groupStyles.card} ${styles.rows}`}>
          <InstallHow lead={false} />
        </div>
      </div>
    </Sheet>
  )
}

export default InstallGuide
