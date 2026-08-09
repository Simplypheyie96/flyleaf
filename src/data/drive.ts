/* The reader's own Drive, used as the shelf between their devices.

   Everything here talks to ONE hidden folder — `appDataFolder` — which Google
   gives every app that asks for the `drive.appdata` scope. It does not appear
   in the reader's Drive listing, no other app can read it, and we cannot see a
   single file outside it. From the builder's side there is no storage bill,
   no database and no ceiling, because none of this is ours.

   ONE FILE, WRITTEN WHOLE. The journey goes up as the same single JSON document
   `backup.ts` already writes for export, rather than as a file per keep. That
   is the honest trade and it is worth naming: a reader with hours of voice
   memos re-uploads the whole document each time it changes, where a per-keep
   store would send only the new one. In exchange there is exactly one format in
   this app, one merge routine, and no way for a half-finished upload to leave a
   journey referring to a recording that never arrived. Sync only runs when
   something actually changed, so the re-upload is per writing session, not per
   keystroke — and if that ever stops being cheap enough, this is the file to
   split, with the format on disk unchanged. */

const FILE_NAME = 'journey.json'
const FILES = 'https://www.googleapis.com/drive/v3/files'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files'

export interface DriveFile {
  id: string
  modifiedTime: string
}

async function ask(token: string, url: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    /* 401 is the one worth naming: it means the hour is up, and the caller can
       get a fresh token and come back rather than telling the reader that
       something broke. */
    throw new Error(response.status === 401 ? 'expired' : `Google Drive said no (${response.status}).`)
  }
  return response
}

/** The journey already in this reader's Drive, or null the first time. */
export async function findJourney(token: string): Promise<DriveFile | null> {
  const url = `${FILES}?spaces=appDataFolder&pageSize=1&orderBy=modifiedTime desc&fields=${encodeURIComponent(
    'files(id,modifiedTime)',
  )}&q=${encodeURIComponent(`name = '${FILE_NAME}'`)}`
  const { files } = (await (await ask(token, url)).json()) as { files?: DriveFile[] }
  return files?.[0] ?? null
}

export async function readJourney(token: string, id: string): Promise<string> {
  return (await ask(token, `${FILES}/${id}?alt=media`)).text()
}

/** Write the journey up, creating the file the first time and overwriting it
    after that. Overwriting is safe here in a way it would not be for most
    apps, because what goes up is always the MERGE of both sides — see sync.ts.
    Nothing is ever replaced by less than itself. */
export async function writeJourney(token: string, body: Blob, id?: string): Promise<DriveFile> {
  if (id) {
    const response = await ask(token, `${UPLOAD}/${id}?uploadType=media&fields=id,modifiedTime`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
    return (await response.json()) as DriveFile
  }

  /* A multipart create, because the first write has to carry the file's
     metadata — its name and, crucially, `parents: ['appDataFolder']`, which is
     what puts it in the hidden folder rather than loose in the reader's Drive
     where it would sit among their own documents. */
  const boundary = `flyleaf-${crypto.randomUUID()}`
  const head =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify({ name: FILE_NAME, parents: ['appDataFolder'] })}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n`
  const multipart = new Blob([head, body, `\r\n--${boundary}--`])

  const response = await ask(token, `${UPLOAD}?uploadType=multipart&fields=id,modifiedTime`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body: multipart,
  })
  return (await response.json()) as DriveFile
}

/** Which Google account this is, for the settings row to name. Best-effort:
    the scope we hold does not include the reader's profile, and Drive's own
    `about` endpoint is allowed to decline it. A row that says "Signed in" is a
    smaller loss than a sync that refuses to run over a display name. */
export async function whoseDrive(token: string): Promise<string> {
  try {
    const { user } = (await (
      await ask(token, `${FILES.replace('/files', '/about')}?fields=user(emailAddress)`)
    ).json()) as { user?: { emailAddress?: string } }
    return user?.emailAddress ?? ''
  } catch {
    return ''
  }
}
