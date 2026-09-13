# Medusa ORM compatibility backport

The three patches backport the data-access compatibility fix from Medusa commit
[`18474de`](https://github.com/medusajs/medusa/commit/18474de124868370298addf195e5229ca6792f81)
to the installed 2.15.3 packages. Upstream code is MIT licensed. The package
patches retain their original license files.

MikroORM 6.6.14 fixes CVE-2026-44680 but rejects virtual and cross-module paths
that Medusa 2.15.3 passes to local entity queries. The upstream helper prunes
those paths at the repository boundary. Its 17 regression cases are retained in
`apps/medusa/src/utils/__tests__/orm-compatibility.unit.spec.ts`.

The backport covers base repositories, product categories, and order queries.
The index module is disabled, so its separate upstream change is unnecessary.
Remove these patches when upgrading Medusa to a release containing the fix,
after checking migrations and exercising catalog, category, cart, and order flows.
