# 017 Package managers: tasks

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Ordered, small and independently reviewable. Each task names the acceptance criteria it satisfies
and is done when its check passes. Branch `features/package-managers`, next free minor version (0.18.0, because 0.17.0 went to the empty Favorites grid of spec 012).
T1 to T6 can land in one pull request; T7 and T8 need Tore's one-time setup and are checked on a
real release.

- [x] **T1.** Add `packaging/homebrew/` with `CaskRenderer`, `ChecksumReader` and the cask template,
  with the three caveats and the launchd label read from the installer constants. Satisfies FR-1,
  FR-2, FR-3. Done when `test_cask_points_to_the_release_dmg_with_its_checksum`,
  `test_cask_uninstall_removes_agent_and_keeps_backups` and
  `test_cask_caveats_explain_gatekeeper_and_app_management` pass.
- [x] **T2.** Add `packaging/apt/apt_repo.py` (`PackageIndex`, `RetentionPolicy`, `ReleaseSigner`,
  `AptRepository`) and `scripts/make-apt-key.sh`. Satisfies FR-4, FR-5, FR-9. Done when
  `test_apt_repository_indexes_the_new_package`, `test_apt_repository_keeps_the_last_three_versions`
  and `test_publication_is_idempotent` pass.
- [x] **T3.** Add the sources file, the keyring and the purge branch to the `.deb`
  (`build_deb.py`, `templates/`), with the public key committed in `packaging/apt/`. Satisfies FR-6,
  FR-7. Done when `test_deb_enrolls_the_vivarcdi_repository` and
  `test_deb_purge_removes_the_repository` pass and `lintian` reports no error.
- [x] **T4.** Add `UpdateAdvisor` with `HomebrewSource`, `AptSource`, `DirectSource` and show the
  advice in the presenter. Satisfies FR-11. Done when
  `test_update_notice_names_the_package_manager_command` passes.
- [x] **T5.** Write the runbook `docs/package-managers-setup.md`. Satisfies FR-12. Done when
  `test_runbook_lists_every_one_time_setup_step` passes.
- [x] **T6.** Add the `publish-tap` and `publish-apt` jobs and the pull request validation to
  `.github/workflows/tests.yml`, skipped with a message when a secret is missing. Satisfies FR-8,
  NFR-1, NFR-2. Done when the workflow passes `actionlint` and the pull request jobs build and read a
  test repository.
- [x] **T7.** README: Download section with the `brew` and `apt` commands first and the direct
  download second, the manual apt setup, and Open Anyway notes for Homebrew. Bump the version in
  `package.json`, `package-lock.json` and `installer/vivarcdi/__init__.py`. Satisfies FR-10. Done
  when `make check` passes.
- [ ] **T8.** Tore follows the runbook once (tap repository, token, key, Pages), then the release of
  0.18.0 publishes both. Satisfies AC-10. Done when the tap shows the new cask version and the Pages
  site lists the new package.
- [ ] **T9.** Write the manual verification checklist for Tore, in Italian, from AC-10 to AC-15
  (`package-managers/verifica-package-manager.md` in the project files).
