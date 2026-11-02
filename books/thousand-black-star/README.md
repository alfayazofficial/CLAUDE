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
| `manuscript/ch-01-…md` | **Chapter 1 — written** |
| `manuscript/ch-30-…md` | **Chapter 30 — Fayaz & Ermis — written** |
| `manuscript/epilogue-draft.md` | The Keeper's torn letter, the Chorus epilogue |
| `tools/gen_ledger.py` | Rebuilds the 1,000-character ledger from the principals file |

## Status

- Planning layer complete: 1,000 characters, 60 stories, 60 chapters.
- Drafted: Prologue, five Act sonnets, Chapter 1, Chapter 30, Epilogue.
- To write: Chapters 2–29 and 31–60 (see outline).

## Rebuilding the ledger

```bash
python3 books/thousand-black-star/tools/gen_ledger.py
```

The 880 supporting characters are deterministic first-draft seeds (fixed seed, fully reproducible). Deepen each one when you draft their chapter, then edit the CSV directly (and stop using the generator once you hand-edit).

## Rules the book follows

1. Exactly 1,000 characters; exactly 60 love stories; exactly 60 chapters.
2. No LGBTQ content: all romances are between a man and a woman.
3. Some stories are unfinished mid-chapter (11 "torn pages"), some are open-ended.
4. Fayaz (Bangladesh) and Ermis (Indonesia): an open-ended, long-distance, online-only love story; Chapter 30 is the heart of the book.
5. Chaste and tender; suitable for a general KDP audience.

Not part of the NEXIV Protocol skill system: this is a separate creative project that shares the repository.
