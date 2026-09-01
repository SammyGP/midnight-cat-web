# How to run and maintain Cat game builds

This guide covers the local static-site workflow and the checks required before replacing the current browser package. The repository deliberately uses one replaceable `builds/latest/` channel, with no build selector or public version history.

The page uses dependency-free, host-neutral static files. It includes a full-width player plus manifest-driven changes, controls, and limitations.

## Run locally

Serve the repository over HTTP from its root directory:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Then open `http://127.0.0.1:4173/`.

Opening `index.html` directly with `file://` is not supported because the page loads its manifest with `fetch`.

## Files

- `README.md` is the concise public repository overview.
- `HOW_TO_RUN.md` contains these local and maintainer instructions.
- `index.html` contains the semantic page structure.
- `styles.css` contains the responsive night-themed presentation.
- `app.js` validates the latest-build manifest, controls the player iframe, and renders text safely.
- `data/versions.json` is the checked-in build-details source.
- `.nojekyll` keeps branch-based static serving independent of Jekyll processing.
- `builds/latest/` contains the current validated Godot Web export, public build information, and local third-party notices.

## Manifest contract

The manifest uses schema version `2` and contains either no entry or exactly one `latest` entry:

```json
{
  "schemaVersion": 2,
  "versions": [
    {
      "id": "latest",
      "label": "Latest development build — Plain-language milestone",
      "date": "YYYY-MM-DD",
      "path": "./builds/latest/index.html",
      "changes": [
        "One plain-text change."
      ],
      "controls": [
        "One plain-text control."
      ],
      "limitations": [
        "One plain-text limitation."
      ]
    }
  ]
}
```

Manifest text is treated as data, and build paths are restricted to this site.

## Replace the latest build

Only replace `builds/latest/` after the matching selected development checkpoint has passed its required local export, content-leak, browser, and package checks. Use an ordinary commit, keep exactly one `latest` manifest entry, remove stale generated siblings, preserve generated sibling base names, and verify the complete inventory, file sizes, and SHA-256 hashes before and after copying.

Serve the complete repository over local HTTP and recheck the page, manifest, iframe, controls, limitations, notice link, response statuses, content types, browser console, keyboard focus, responsive layout, reload behavior, and the selected gameplay evidence. Keep repository content free of credentials, private source metadata, local paths, and internal task material.

The current export is about 40.3 MB (38.4 MiB); almost all of that is Godot's WebAssembly runtime. Reusing the `latest` path does not remove prior binary revisions from Git history, although Git can reuse unchanged blobs.

Before each selected replacement, measure the candidate's incremental packed Git-object growth in a disposable full clone and record the resulting published-tree size. Continue with ordinary commits only while the repository and published site remain safely below 800 MiB. Stop for a storage and deployment decision before a replacement would cross, or cannot demonstrate compliance with, that limit. Do not use a release, automated workflow, force-push, or history rewrite as a storage workaround.

## Licensing

This repository does not grant an open-source license for the game, page, or artwork. The browser package includes the applicable Godot and component information in the local [third-party notices](./builds/latest/third-party-notices.html); those notices do not grant a license for project-owned code, page content, or artwork.
