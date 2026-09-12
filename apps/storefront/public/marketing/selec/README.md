# Selec marketing imagery

Sourced on 6 September 2026 from the official Selec website and its linked webshop image hosting. `sources.json` records the original category page, direct asset URL and description for each photograph.

The 19 category photographs are stored unchanged. CSS uses contain sizing and spacing to preserve complete equipment silhouettes in chips, cards and category grids. These images are only used for category and marketing visuals. Medusa product thumbnails, galleries and records are unchanged.

`automation-hero.jpg` and `panel-hero.jpg` are AI-composed marketing covers created with the built-in image_gen tool using the corresponding official category photographs as references. They are illustrative category compositions, not catalog product photographs. The reference files and generation prompts are recorded in `sources.json`.

The eight existing Medusa category handles retain direct category links. Additional official Selec families use catalog search links; matching results depend on the products imported into Medusa. No backend categories or products were created.

Category-index and subcategory imagery are resolved in `src/config/category-images.ts`. Unknown subcategories inherit their parent family image; unknown roots retain the initial fallback. Existing explicit category metadata images take priority where supplied.
