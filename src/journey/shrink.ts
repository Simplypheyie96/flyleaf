/* A photo off a modern phone is 4000px wide and 5–15MB. Nothing in Flyleaf
   ever shows one bigger than a card, and every one of those megabytes is spent
   twice — once against the browser's storage allowance, which is what evicts a
   reader's whole journey, and again in the export file they carry to a new
   device. So a picture is brought down to a size worth reading before it is
   kept.

   2000px on the long edge is well past anything the app draws, including the
   share plate at 2x, so nothing on screen gets softer. JPEG at 0.85 because
   these are photographs of pages and rooms, not line art with flat fills.

   If any of it fails — an image the decoder will not open, a canvas the
   browser will not export — the original comes back untouched. A slightly
   large picture kept is better than a picture refused. */

const EDGE = 2000
/* Above this, something has gone wrong rather than merely been generous: a raw
   file, a video renamed, a scan of a whole book. Refused with a sentence
   instead of filling the device silently. */
const TOO_BIG = 40 * 1024 * 1024

export const tooBig = (file: File) => file.size > TOO_BIG

export async function shrink(file: File): Promise<File | Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, EDGE / Math.max(bitmap.width, bitmap.height))
    if (scale === 1 && file.size < 1_500_000) {
      bitmap.close()
      return file
    }
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ink = canvas.getContext('2d')
    if (!ink) return file
    ink.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const smaller = await new Promise<Blob | null>((done) => {
      canvas.toBlob(done, 'image/jpeg', 0.85)
    })
    return smaller && smaller.size < file.size ? smaller : file
  } catch {
    return file
  }
}
