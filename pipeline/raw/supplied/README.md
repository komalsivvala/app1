# pipeline/raw/supplied/ — the consolidated dataset

Provided 20 Sep 2026, after `aptransport.org` proved unreachable from the build environment.
Committed for reproducibility and provenance, exactly like the official PDFs in the parent
directory.

| File | Use |
|---|---|
| `LLR_Andhra_Pradesh.csv` | **The ingest input.** 277 rows, state-filtered to AP-correct answers |
| `LLR_Master_All_India.csv` | 440 rows. **Do not ship for AP** — carries the Delhi/Maharashtra sides of the conflict register |
| `LLR_State_Profiles.csv` | Format, fees and speed schedules for all 36 states/UTs |
| `LLR_Question_Bank_StateWise.pdf` | Provenance, the cross-state conflict register (p13), category coverage |

`LLR_Telangana.csv` was also supplied but is **byte-identical** to the AP file (same md5), so it
is not committed twice.

**This is not the official AP bank.** No row cites an AP source; the compilation used Telangana's
published bank because AP's pages block automated retrieval. See `docs/07-content-assessment.md`
§3 before making any claim about provenance in a store listing.

**There is no Telugu in any of these files.** See §2 of the same document.
