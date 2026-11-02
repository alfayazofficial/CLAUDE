# THOUSAND BLACK STAR

*A novel in sixty chapters. One thousand souls. Sixty love stories.*
By **Al Fayaz** · written in the manner of Shakespeare · for Amazon KDP

## What's in this folder

| File | What it is |
|---|---|
| `00-series-bible.md` | Premise, frame device, five-act structure, style guide, content rules, KDP plan |
| `01-love-stories-60.md` | The 60 love stories: couples, settings, premises, endings, chapters |
| `02-character-bible-principals.md` | The 120 principal characters (hand-written profiles) |
| `03-ledger-1000.csv` / `.md` | All 1,000 characters with Register numbers 0001–1000 |
| `04-chapter-outline-60.md` | Chapter-by-chapter outline, plus the Fayaz & Ermis thread |
| `manuscript/00-prologue-and-act-sonnets.md` | Title page, Prologue, and one Chorus sonnet per act |
| `manuscript/ch-01-…md` … `ch-60-…md` | **All 60 chapters, drafted** (Ch 30 is Fayaz & Ermis) |
| `manuscript/_continuity/` | One-line continuity notes per writing batch (invented facts, hooks) |
| `manuscript/epilogue-draft.md` | Early draft of the epilogue (superseded by Ch 60) |
| `THOUSAND-BLACK-STAR-full-manuscript.md` | **Everything compiled into one file** (~225,000 words) |
| `tools/build_manuscript.py` | Rebuilds the compiled manuscript from the chapter files |
| `tools/gen_ledger.py` | Rebuilds the 1,000-character ledger from the principals file |

## Status

- Planning layer complete: 1,000 characters, 60 stories, 60 chapters.
- **Full first draft complete**: Prologue, four Act sonnets, 60 chapters, Epilogue (inside Ch 60), about 225,000 words.
- 11 torn-page chapters (15, 16, 20, 26, 32, 36, 37, 42, 48, 54, 60) verified.
- Next: a full read-through edit, continuity pass using `manuscript/_continuity/`, proofreading, cover, KDP formatting.

## Rebuilding the ledger

```bash
python3 books/thousand-black-star/tools/gen_ledger.py
python3 books/thousand-black-star/tools/build_manuscript.py   # rebuild the single-file manuscript
```

The 880 supporting characters are deterministic first-draft seeds (fixed seed, fully reproducible). Deepen each one when you draft their chapter, then edit the CSV directly (and stop using the generator once you hand-edit).

## Rules the book follows

1. Exactly 1,000 characters; exactly 60 love stories; exactly 60 chapters.
2. No LGBTQ content: all romances are between a man and a woman.
3. Some stories are unfinished mid-chapter (11 "torn pages"), some are open-ended.
4. Fayaz (Bangladesh) and Ermis (Indonesia): an open-ended, long-distance, online-only love story; Chapter 30 is the heart of the book.
5. Chaste and tender; suitable for a general KDP audience.

Not part of the NEXIV Protocol skill system: this is a separate creative project that shares the repository.
