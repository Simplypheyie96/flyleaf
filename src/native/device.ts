/* The phone's own camera, share sheet and printer, for the store apps only.
   A webview cannot download a file (an <a download> does nothing), and
   window.print() is a no-op in both WKWebView and Android's WebView, so these
   stand in for them. Every caller checks `native` first; nothing here is
   imported on the web. */

const cancelled = (e: unknown) => /cancel/i.test(`${(e as { code?: string })?.code} ${(e as Error)?.message}`)

/** "Take photo" or "Choose from library", in the phone's own action sheet.
    Resolves null when the reader backs out of either step. */
export async function pickPhoto(): Promise<File | null> {
  const [{ ActionSheet, ActionSheetButtonStyle }, { Camera, MediaTypeSelection }] = await Promise.all([
    import('@capacitor/action-sheet'),
    import('@capacitor/camera'),
  ])
  const { index } = await ActionSheet.showActions({
    title: 'Add a photograph',
    options: [
      { title: 'Take photo' },
      { title: 'Choose from library' },
      { title: 'Cancel', style: ActionSheetButtonStyle.Cancel },
    ],
  })
  if (index !== 0 && index !== 1) return null
  try {
    const shot =
      index === 0
        ? await Camera.takePhoto({ quality: 90, correctOrientation: true })
        : (await Camera.chooseFromGallery({ mediaType: MediaTypeSelection.Photo, limit: 1, quality: 90 })).results[0]
    if (!shot?.webPath) return null
    const blob = await (await fetch(shot.webPath)).blob()
    const type = blob.type || 'image/jpeg'
    return new File([blob], `photo.${type.split('/')[1] ?? 'jpg'}`, { type })
  } catch (e) {
    if (cancelled(e)) return null
    throw e
  }
}

function base64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/** Hands a file to the share sheet, which is where "Save to Files", AirDrop,
    Drive and mail all live on a phone. */
export async function shareFile(blob: Blob, name: string): Promise<void> {
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import('@capacitor/filesystem'),
    import('@capacitor/share'),
  ])
  const { uri } = await Filesystem.writeFile({ path: name, data: await base64(blob), directory: Directory.Cache })
  try {
    await Share.share({ files: [uri], title: name })
  } catch (e) {
    if (!cancelled(e)) throw e
  }
}

export async function shareText(text: string, title: string): Promise<void> {
  const { Share } = await import('@capacitor/share')
  try {
    await Share.share({ text, title })
  } catch (e) {
    if (!cancelled(e)) throw e
  }
}

/** The system print sheet for the page on screen, with "Save as PDF" in it.
    A local plugin (ios/App/App/PrintPlugin.swift, android …/PrintPlugin.java). */
export async function printPage(name: string): Promise<void> {
  const { registerPlugin } = await import('@capacitor/core')
  await registerPlugin<{ print(o: { name: string }): Promise<void> }>('Print').print({ name })
}
