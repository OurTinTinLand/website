# pocketbase-cli (vendored)

This directory holds a built snapshot of
[Ericsunsk/Pocketbase-CLI](https://github.com/Ericsunsk/Pocketbase-CLI) so
`scripts/pb-cli.mjs` (and any other internal script) can shell out to the
CLI without depending on a global install.

* Source repo: <https://github.com/Ericsunsk/Pocketbase-CLI>
* Vendored version: see `package.json` → `_upstream.version`
* Update: run `bash scripts/install-pbcli.sh` (clones fresh + builds + copies)

We vendor the compiled `dist/` only — no `node_modules/`, no source. This
keeps the repo small and avoids drift; if you want to audit the code, read
the upstream repo at the pinned tag. The wrapper script
`scripts/pb-cli.mjs` defaults to invoking `./dist/bin.js` here and falls
back to a globally-installed `pocketbase-cli` only if the vendored binary
is missing.
