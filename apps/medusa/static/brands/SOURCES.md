# Brand artwork

- `selec-logo.png`: official Selec logo, downloaded from https://www.selec.com/apps/web-in/media/logos/seleclogo.png (linked by https://www.selec.com/).
- `selec-cover.jpg`: illustrative marketing composition created in the preceding imagery task using official Selec PLC, HMI and drive photographs. Reference URLs and generation prompt are in `apps/storefront/public/marketing/selec/sources.json`, entry `automation-hero`.

These are initial assets, not a hard-coded frontend registry. `setup-brand-assets.ts` persists their paths in Medusa's store metadata without overwriting an existing Selec profile. Admin → Brands can replace either image using the file-upload controls.
