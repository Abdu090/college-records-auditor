# Faculty Records Auditor (مدقق سجلات الكليات)

A single-page tool for the Academic Quality Office at the National University – Sudan.
It checks every course folder against the 16-item British Accreditation Council (BAC) course-records checklist
and marks each item as **available**, **empty** (a blank template that was never filled in) or **missing**.

## Features
- Folder or ZIP upload; the folder structure Batch → Semester → CS/IT → Course is detected automatically.
- Empty-file detection: tiny files, and files whose size equals a known blank faculty template.
- Batch / semester / track filters and course search.
- Per-item guidance for anything not available: owner, what to do, and the matching blank template.
- Excel export (summary, matrix, missing-and-empty task list).
- Scan history with the change between the last two scans.
- Arabic (RTL) and English interface.
- Optional AI content check and a central quality-office dashboard. These two only work when the page runs inside Claude; as a plain web page they are shown as unavailable.

## Privacy
All processing happens in the browser. No file is uploaded to any server.

## Run
Open `index.html` in a browser, or deploy the folder as a static site (no build step).
Click "جرّب بعيّنة تجريبية" / "Try a sample" to see it with made-up file names.
