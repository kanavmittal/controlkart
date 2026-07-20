/**
 * Athens button — CVA variants translated from the `.athens-btn*` CSS rules
 * in `src/app/globals.css` (~L138-193). This is a restyle only: the Base UI
 * `render` prop mechanics and `data-icon` handling below are unchanged from
 * the generated base-nova component.
 *
 * Mapping (CSS class -> `variant` prop):
 *   .athens-btn          -> default     solid #004FC7 (--primary), white text,
 *                                        radius var(--radius-button) = 2px
 *   .athens-btn-outline  -> outline     white bg, #004FC7 text/border,
 *                                        radius var(--radius-button) = 2px
 *   .athens-btn-ghost    -> ghost       white bg, #232323 text, #dfdfdf
 *                                        (--border) 1px border, radius 5px
 *                                        (--radius) — bordered, NOT the
 *                                        invisible stock shadcn ghost
 *   (no Athens class)    -> secondary   same shape as default, #287DFF —
 *                                        the Athens secondary blue used for
 *                                        Add-to-cart CTAs
 *   (no Athens class)    -> destructive solid var(--destructive) #c61c1c,
 *                                        radius var(--radius-button)
 *   (no Athens class)    -> link        text-only, var(--primary), unchanged
 *                                        from stock aside from base sizing
 *
 * Sizes are scaled off the 44px height implied by `.athens-btn` /
 * `.athens-btn-outline` (14.5px/13.5px vertical padding + 15px line-height +
 * borders, all border-box) — taller than the stock preset's h-8 default.
 * `ghost`'s own box model (12px/20px padding, 6px gap) computes to a
 * literal 41px and is overridden via `compoundVariants` at `size: "default"`
 * rather than sharing the 44px anchor.
 */

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center border border-transparent bg-clip-padding text-[15px] leading-none font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // .athens-btn
        default:
          "rounded-[var(--radius-button)] bg-primary text-primary-foreground hover:bg-[#0043a9] aria-expanded:bg-[#0043a9]",
        // Athens secondary blue (#287DFF) — Add-to-cart CTA; same shape as default
        secondary:
          "rounded-[var(--radius-button)] bg-[#287dff] text-white hover:bg-[#226ad9] aria-expanded:bg-[#226ad9]",
        // .athens-btn-outline
        outline:
          "rounded-[var(--radius-button)] border-primary bg-background text-primary hover:bg-primary hover:text-primary-foreground aria-expanded:bg-primary aria-expanded:text-primary-foreground",
        // .athens-btn-ghost — bordered, not the invisible stock ghost
        ghost:
          "rounded-[5px] border-border bg-background text-[#232323] hover:border-[#232323] aria-expanded:border-[#232323]",
        destructive:
          "rounded-[var(--radius-button)] bg-destructive text-white hover:bg-[#a81818] focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-11 gap-2 px-6 has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        xs: "h-8 gap-1 px-3 text-[13px] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 px-4 text-[14px] has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 gap-2 px-8 text-[16px] has-data-[icon=inline-end]:pr-6 has-data-[icon=inline-start]:pl-6",
        icon: "size-11",
        "icon-xs": "size-8 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-12",
      },
    },
    compoundVariants: [
      // .athens-btn-ghost's own box model differs from the 44px anchor used
      // by the other variants: 12px/20px padding + 15px line-height + 1px
      // border (border-box) = 41px tall, with a 6px icon gap — so `ghost` +
      // `default` size is overridden to the literal CSS instead of h-11/px-6.
      {
        variant: "ghost",
        size: "default",
        class: "h-auto gap-1.5 px-5 py-3",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  render,
  nativeButton,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      // When `render` swaps in a non-button element (e.g. a Next <Link>/anchor),
      // it's no longer a native <button>, so Base UI needs nativeButton=false to
      // drop native-button semantics. Default from presence of `render`; callers
      // can still override explicitly (e.g. render={<button>} → nativeButton).
      render={render}
      nativeButton={nativeButton ?? render === undefined}
      {...props}
    />
  )
}

export { Button, buttonVariants }
