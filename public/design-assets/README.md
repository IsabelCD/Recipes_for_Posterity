# Missing photographs

Two photographs from the original Claude Design import were too large for
the design MCP's 256 KiB file-read cap and could not be recovered (see the
project README for details). The app falls back to a plain gradient panel
until real files are added here:

- `hero-collage.png` — the wide banner photo at the top of the Home and
  About pages (originally `uploads/Presentation1.png`).
- `about-photo.jpg` — the photo box on the About page (originally
  `img_3605-mt74qexg-t4zo.jpg`).

Drop replacement images at those two paths (same filenames) and they will
appear automatically — no code changes needed.
