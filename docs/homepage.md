# Homepage management

The homepage shows the existing automation hero, all live categories, brands, Featured Products, the company introduction, blog posts, and the shared footer. Existing colors, cards and imagery are retained.

## Featured Products

In Medusa Admin, open Products → Collections and select **Homepage Featured Products**. Add or remove products using the collection editor. Keep its handle **homepage-featured**. The homepage displays up to eight published products available to the storefront, with their current prices and badges. Changes appear after the storefront cache refreshes (about 60 seconds). An empty or missing collection hides the section.

Medusa products belong to one collection at a time; assigning a product here moves it from any other collection. Category assignments are independent.

For another environment run:

```sh
pnpm --filter @controlkart/medusa exec medusa exec ./src/scripts/setup-homepage-featured.ts
```

This creates the collection once and initially selects up to eight published products that do not already belong to a collection. Existing selections are preserved on reruns.

Categories and brands come from Medusa. Blog posts come from the existing content editor. Product imagery is unchanged.
