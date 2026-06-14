---
name: liquid-glass-product-ui
description: Design or review restrained, content-first product interfaces inspired by Apple Liquid Glass. Use for app navigation, controls, status surfaces, floating toolbars, overlays, publishing consoles, editors, and spatial product UI that needs material tokens, motion, accessibility fallbacks, anti-slop constraints, or a Liquid Glass design audit.
---

# Liquid Glass Product UI

Use Liquid Glass as a functional layer above content, never as the content itself.
Prioritize legibility, hierarchy, platform behavior, and task completion over visual
novelty.

## Core Principles

1. **Content remains primary.** Keep reading, editing, media, and data surfaces solid
   enough to remain stable under changing backgrounds.
2. **Glass communicates elevation.** Apply it to controls that float above or move
   independently from content.
3. **Material responds to context.** Adjust tint, border, diffusion, and contrast
   according to the background below it.
4. **One hierarchy, one material layer.** Do not stack translucent surfaces unless
   the upper layer is a temporary system overlay with clear separation.
5. **Shape follows interaction.** Use capsule shapes for compact controls, rounded
   rectangles for toolbars and panels, and tighter radii for dense lists.
6. **Clarity beats transparency.** Increase diffusion or opacity before allowing
   text contrast to deteriorate.
7. **Spatial depth must carry meaning.** Elevation indicates navigation, selection,
   temporary focus, progress, or an actionable state.

## Use Glass For

- Global and local navigation that floats above changing content.
- Compact toolbars, segmented controls, filter bars, and status rails.
- Bottom action docks that remain visible while the document scrolls.
- Popovers, menus, sheets, dialogs, and transient inspection surfaces.
- A single queue or control container whose rows use solid or lightly tinted
  internal surfaces.
- Small status indicators whose background context changes.

Ask three questions before applying glass:

1. Does this element float above content or move independently?
2. Does translucency preserve useful context?
3. Does the element remain readable over the busiest allowed background?

Use a solid surface if any answer is no.

## Never Use Glass For

- Long-form article bodies, forms with sustained input, code editors, or reading
  canvases.
- Every card in a grid, every row in a list, or nested cards.
- Glass on glass. Child items inside a glass container must normally be solid,
  tinted, or border-separated.
- Large background regions whose only purpose is visual atmosphere.
- Error messages, legal text, critical confirmations, or dense small text when
  transparency reduces contrast.
- Decorative blobs, glowing spheres, meaningless 3D objects, or gradients that do
  not encode product state.
- Screens where disabling transparency destroys hierarchy or makes controls merge
  with content.

## Material Tokens

Start from these ranges, then tune against actual content. Do not copy one recipe to
every surface.

```css
:root {
  --glass-blur-compact: 14px;
  --glass-blur-nav: 22px;
  --glass-blur-overlay: 28px;

  --glass-opacity-compact: 0.78;
  --glass-opacity-nav: 0.66;
  --glass-opacity-overlay: 0.86;

  --glass-border: oklch(100% 0 0 / 0.16);
  --glass-border-strong: oklch(100% 0 0 / 0.24);

  --glass-shadow:
    0 22px 70px oklch(5% 0.01 50 / 0.42),
    0 2px 10px oklch(5% 0.01 50 / 0.22);

  --glass-radius-control: 999px;
  --glass-radius-panel: 20px;
  --glass-radius-row: 12px;

  --glass-highlight: inset 0 1px 0 oklch(100% 0 0 / 0.18);
  --glass-inner-glow: inset 0 0 18px oklch(100% 0 0 / 0.035);
}
```

### Token Guidance

- **Blur:** 14–28px. Use less blur for dense controls and more for isolated
  overlays. Never use blur to hide a poor background.
- **Opacity:** 0.62–0.88. Increase opacity behind text or complex content.
- **Border:** 1px light edge at 12–24% opacity. Use a darker outer edge on light
  themes.
- **Shadow:** Broad, low-contrast ambient shadow plus a very small near shadow.
  Avoid glowing colored shadows.
- **Radius:** 10–14px for rows, 18–24px for panels, full capsule for compact
  navigation and segmented controls.
- **Highlight:** One restrained top or directional highlight. Do not outline every
  edge equally.
- **Inner glow:** 2–5% white opacity. Remove it if it makes the surface look
  plastic.

## Motion

- Keep motion subtle, responsive, low-frequency, natural, and optional.
- Use 150–250ms transitions for hover, focus, selection, and disclosure.
- Use ease-out curves such as `cubic-bezier(0.22, 1, 0.36, 1)`.
- Animate opacity and transforms. Avoid layout-property animation.
- Let material react only to meaningful state changes: selection, progress,
  opening, closing, or task completion.
- Do not loop orb, glow, shimmer, or floating-card animations during normal work.
- Make every workflow usable with motion disabled.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

## Accessibility

### Reduced Motion

- Remove nonessential transforms, parallax, spring effects, and animated blur.
- Preserve immediate state feedback through color, text, icons, and ARIA state.

### Reduced Transparency

Support both the emerging media query and a deterministic fallback class when the
browser does not expose the preference.

```css
@media (prefers-reduced-transparency: reduce) {
  .glass {
    background: oklch(23% 0.012 58);
    backdrop-filter: none;
  }
}

@supports not (backdrop-filter: blur(2px)) {
  .glass {
    background: oklch(23% 0.012 58);
  }
}
```

### Contrast

- Target WCAG AA at minimum: 4.5:1 for body text and 3:1 for large text and
  essential UI boundaries.
- Test glass over the brightest, darkest, and busiest permitted backgrounds.
- Never put low-opacity gray labels on translucent gray panels.
- Keep focus rings visible without relying on material highlights.
- Increase surface opacity and border strength under `prefers-contrast: more`.

## AI Slop Prohibitions

Reject the design if it contains any of the following:

- A generic SaaS dashboard shell unrelated to the actual workflow.
- Full-screen blur or glass used as wallpaper.
- Glass cards nested inside glass panels.
- Random gradient balls, 3D blobs, fake holograms, or neon AI decoration.
- Meaningless charts, vanity metrics, or invented analytics.
- Tiny low-contrast labels used to create artificial density.
- Repeated identical cards when a grouped list is the correct structure.
- Gradient text, excessive glow, or colored shadows without semantic meaning.
- Platform capabilities treated as identical when workflows differ.
- Controls with inconsistent shape, size, labels, or interaction states.
- Hover-only actions, decorative motion, or keyboard-inaccessible controls.
- Copy that could belong to any product, placeholder text, or fabricated status.

## Design Workflow

1. Write the real task sequence in verbs.
2. Identify the content plane, control plane, and transient overlay plane.
3. Keep the content plane solid and readable.
4. Assign glass only to control and transient planes.
5. Define semantic states before drawing cards.
6. Test the busiest state, not only the empty state.
7. Add reduced-motion, reduced-transparency, and increased-contrast behavior.
8. Inspect desktop and compact layouts in a real browser.

## Design Review Gate

Run this gate before every UI modification. Stop and revise the proposed change if
any answer is no.

- [ ] Does the article editor remain a solid paper surface with high readability?
- [ ] Is glass limited to navigation, status, controls, and transient overlays?
- [ ] Does the change avoid glass on glass?
- [ ] Does the change avoid full-screen blur?
- [ ] Are labels readable without low-contrast micro text?
- [ ] Does the change avoid meaningless 3D blobs and random gradient spheres?
- [ ] Do all affected buttons define hover, focus, active, and disabled states?
- [ ] Do Reduced Motion and Reduced Transparency still have deliberate fallbacks?
- [ ] Are platform states based on real workflow evidence rather than decorative
      sample data?
- [ ] Does the compact layout use drawers or layered navigation instead of merely
      squeezing the desktop layout?

Record any intentional exception in the task notes and explain the product reason.

## Self-Check

- [ ] The primary task remains obvious without reading decorative labels.
- [ ] Content and editor surfaces are solid enough for sustained reading.
- [ ] Every glass surface has a navigation, control, status, or overlay purpose.
- [ ] No glass surface contains another decorative glass surface.
- [ ] Text remains readable over the busiest background.
- [ ] Blur, opacity, border, shadow, radius, highlight, and inner glow use tokens.
- [ ] Hover, focus-visible, active, disabled, loading, success, warning, and error
      states are defined where relevant.
- [ ] Motion is subtle, infrequent, and disabled by Reduced Motion.
- [ ] Reduced Transparency produces a deliberate solid hierarchy.
- [ ] Increased Contrast strengthens labels and boundaries.
- [ ] Keyboard navigation and touch targets work.
- [ ] The layout adapts structurally for tablet and narrow screens.
- [ ] Product data and platform capabilities are realistic.
- [ ] No item from the AI slop prohibition list remains.

## Primary References

- [Apple Human Interface Guidelines: Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- [Apple Human Interface Guidelines: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [Apple WWDC25: Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/)
- [Apple WWDC25: Get to know the new design system](https://developer.apple.com/videos/play/wwdc2025/356/)
- [Apple: Adopting Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass)

Use current Apple guidance as a principle source. Translate it to the target
platform rather than imitating system components pixel for pixel.
