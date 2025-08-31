Agent: Perform items in this checklist from top to bottom. After each item, run `pnpm check:fix`. Finally, test the feature and verify it works. When everything is complete, check the item off.

- [x] Remove all emoji from all log messages and Discord messages
- [ ] Update test DB setup/teardown so that we only do migrations on initial test suite start, and we use truncation after every test to clear tables. This should all happen in global test suite configuration.
- [ ] Setup global test config to clear all mocks, spies, etc.
- [ ] Look through all integration tests and remove any DB/table setup/teardown steps that are redundant with the new global DB setup/teardown.
- [ ] Replace all useless reassignments of `const client = db` with direct use of `db`
