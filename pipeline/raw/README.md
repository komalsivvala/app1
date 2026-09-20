# pipeline/raw/ — the official source PDFs

The six PDFs published by the Transport Department, Government of Andhra Pradesh:

| File | Topic | Language |
|---|---|---|
| `road-signs-english.pdf` | Road Signs | English |
| `road-signs-telugu.pdf` | Road Signs | Telugu |
| `rules-of-road-regulations-english.pdf` | Rules of Road Regulations | English |
| `rules-of-road-regulations-telugu.pdf` | Rules of Road Regulations | Telugu |
| `general-driving-principles-english.pdf` | General Driving Principles | English |
| `general-driving-principles-telugu.pdf` | General Driving Principles | Telugu |

Index: <https://www.aptransport.org/html/llr-question-bank.html>
Exact URLs: `pipeline/sources.json`

## These are committed on purpose

A question bank you cannot reproduce is a question bank you cannot audit. Committing the
PDFs means any future contributor can re-run the pipeline and get byte-identical output,
and `manifest.json` (SHA-256 per file) makes an upstream change visible as a diff rather
than as a silent content shift.

## How they get here

```bash
python3 pipeline/01_download.py            # fetch from aptransport.org
python3 pipeline/01_download.py --offline  # hash PDFs you placed here by hand
```

Use `--offline` when the network blocks `aptransport.org`. Download the six from the
index page above, drop them in this directory, and every downstream stage behaves exactly
as if the fetch had succeeded — the manifest records which mode produced it, so
provenance stays unambiguous.

## Never put anything else here

No hand-edited PDFs, no PDFs from commercial RTO-exam sites, no placeholders. This
directory is the provenance record for every question that reaches a user. If a file here
did not come from `aptransport.org`, the bank's claim to be the official AP question bank
is false.
