---
name: react-ui-enhance
description: Use when improving the UI/UX of a React component or page — covers reading the existing component, understanding its context, applying visual/interaction improvements, and validating the result compiles and builds.
---

# React UI Enhancement Workflow

Use this skill when the user asks to improve, redesign, or enhance the UI of a React component or page.

## When to use

- "Can you improve the UI on this?"
- "Make this look better"
- "The design needs work"
- "Can you make it look like [reference]?"
- Any request to enhance visual presentation or user experience

## Procedure

### 1. Read and understand the current component

- Read the full component file
- Identify: what library/framework is used (Tailwind, MUI, Chakra, etc.)
- Identify: the component structure, props, state, routing
- Note: any `@ts-nocheck` or type issues that should be fixed

### 2. Understand the project context

- Check for theme configuration (ThemeProvider, tailwind.config, etc.)
- Check for design system components (Button, Card, Modal, etc.)
- Check for animation libraries (framer-motion, GSAP, etc.)
- Note the color scheme, spacing conventions, typography

### 3. Plan improvements

Consider these enhancement areas (prioritize based on what the user asked):

- **Layout**: spacing, alignment, grid/flex usage, responsive design
- **Typography**: font sizes, weights, hierarchy, readability
- **Color**: contrast, consistency, brand alignment, dark mode support
- **Interactions**: hover states, transitions, animations, feedback
- **Components**: use existing design system components instead of custom ones
- **Accessibility**: ARIA labels, keyboard navigation, color contrast
- **Responsiveness**: mobile/tablet/desktop breakpoints

### 4. Implement changes

- Preserve all existing functionality (routing, state, API calls)
- Keep the same prop interface unless explicitly asked to change it
- Use the project's existing styling approach (don't introduce new CSS frameworks)
- Add smooth transitions for visual changes (framer-motion, CSS transitions)
- Ensure responsive behavior at all breakpoints

### 5. Validate

```bash
# Type check
cd <project_dir> && npx tsc --noEmit 2>&1

# Build check
cd <project_dir> && npx vite build 2>&1 | tail -15
```

- Fix any type errors before claiming completion
- The build must succeed with no errors

### 6. Before/after summary

Show the user what changed:
- What visual improvements were made
- What accessibility improvements were made (if any)
- Any new dependencies added (if any)

## Common patterns

- **Hero sections**: Use framer-motion for entrance animations, gradient backgrounds, responsive text sizing
- **Cards/Lists**: Consistent spacing, hover effects, shadow depth
- **Tables**: Remove text truncation when readability is important, use proper column widths
- **Navigation**: Active states, smooth transitions, mobile hamburger menu
- **Forms**: Inline validation, loading states, clear action buttons
