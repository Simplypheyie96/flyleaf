/* The imprint — what everything that leaves this app is signed with.

   One string, in `brand/` rather than in any of the six places that print it,
   because six copies of a name is five chances for one of them to say
   something slightly different. Everything may depend on brand; brand depends
   on nothing, which is why a data file, a canvas and a printed page can all
   reach it without any of them reaching through each other.

   WHY THESE WORDS. "Kept in Flyleaf" is a colophon, not a watermark. A
   colophon is the line where a press names itself at the end of a book it
   printed — it names the maker of the OBJECT and leaves the work alone, which
   is exactly the relationship this app has to a reader's reading. "Made with",
   "Shared from" and a bare "Flyleaf" all read as an advertisement standing on
   somebody's quotation; "kept" is the app's own verb for what a reader does
   here, so the line says what happened rather than what to install.

   HOW IT IS SET, everywhere it appears: small caps, tracked, in the app's own
   labelling face — the same treatment the shared pictures already use for a
   term, an author and a page number. Never larger than the provenance beside
   it, never in the reading face, never over the words. One line at the foot,
   and it stops there.

   NOTE FOR ANYONE READING THE HISTORY. Three files used to carry a paragraph
   arguing that nothing shared may say "Flyleaf" at all. That was a real
   position honestly held, and it was reversed by the app's owner: everything
   shared now carries this line. The paragraphs are gone rather than left
   standing next to code that contradicts them. */

export const IMPRINT = 'Kept in Flyleaf'
