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

/** Turn Drive's refusal into a sentence a reader can act on. Google puts a
    machine-readable `reason` in the body of every error it returns; this reads
    it and says the corresponding human thing, falling back to the status only
    when the body is something unexpected. */
async function explain(response: Response): Promise<string> {
  let reason = ''
  try {
    const body = (await response.json()) as {
      error?: { errors?: { reason?: string }[]; message?: string }
    }
    reason = body.error?.errors?.[0]?.reason ?? ''
  } catch {
    /* An error page rather than an error object. The status still says
       something, and that is what the last line falls back to. */
  }

  if (reason === 'insufficientPermissions' || reason === 'insufficientFilePermissions')
    return 'Flyleaf was not given permission to use your Drive. Sign in again and leave the Flyleaf box ticked on Google’s screen.'
  if (reason === 'storageQuotaExceeded') return 'Your Google Drive is full, so nothing could be saved to it.'
  if (reason === 'rateLimitExceeded' || reason === 'userRateLimitExceeded')
    return 'Google asked us to slow down. Syncing will try again shortly.'
  if (response.status === 403)
    return 'Google would not let Flyleaf into your Drive. Sign in again and leave the Flyleaf box ticked.'
  if (response.status >= 500) return 'Google Drive is having trouble. Syncing will try again shortly.'
  return 'Your journey could not reach Google Drive. Check your connection and try again.'
}

async function ask(token: string, url: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    /* 401 is the one worth naming to the CALLER: it means the hour is up, and
       it can get a fresh token and come back rather than telling the reader
       that something broke.

       Everything else is named to the READER, and "Google Drive said no (403)"
       was not that. A number is not a thing anybody can act on, and the two
       things a 403 actually means here have completely different answers:
       either the reader left the Drive box unticked on Google's consent screen
       — Google shows a checkbox per permission and quietly hands back a token
       without the one it covers — or their Drive is full. Both are fixable in
       about ten seconds by somebody who is told which it is. */
    if (response.status === 401) throw new Error('expired')
    throw new Error(await explain(response))
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
