# Live GitHub portfolio sync

The profile README is updated automatically every six hours and can also be run from Actions → Sync live GitHub portfolio → Run workflow.

## Required setup

1. Create a fine-grained personal access token for `derricknyamai11` with read-only Metadata and Contents access to the repositories that should appear in this profile.
2. In `derricknyamai11/Derrick-Okoth`, add it as an Actions secret named `PROFILE_SYNC_TOKEN`.
3. Review `.github/workflows/sync-profile.yml` before enabling private-project display. Because this repository is public, `INCLUDE_PRIVATE_PROJECTS: "true"` publishes private repository names, links, descriptions, and languages in `README.md`. Set it to `"false"` to keep them out.

The generated section is bounded by `AUTO-GENERATED:PROFILE-START` and `AUTO-GENERATED:PROFILE-END`; manually maintained content outside those markers is preserved.
