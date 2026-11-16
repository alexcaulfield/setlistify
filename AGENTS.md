# Styling Guidelines

- Prefer Tailwind CSS utility classes for component styling.
- When custom CSS rules are needed (e.g., `@supports`, `@starting-style`, pseudo-classes, or complex animations), always place them in `.css` files (such as `src/index.css` or a co-located component `.css` file) and apply them via CSS classes rather than inline `<style>` tags, inline `style={{ ... }}` attributes, or direct `element.style.<prop>` assignments inside `.tsx` files.
- If dynamic runtime coordinates are required by a script fallback, pass them via CSS custom properties (`setProperty('--var', value)`) consumed by a class rule in the `.css` file.
