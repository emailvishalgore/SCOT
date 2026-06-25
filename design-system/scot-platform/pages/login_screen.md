# Login Screen Page Overrides

> **PROJECT:** SCOT Platform
> **Generated:** 2026-06-24 16:42:25
> **Page Type:** Authentication

> ⚠️ **IMPORTANT:** Rules in this file **override** the Master file (`design-system/MASTER.md`).
> Only deviations from the Master are documented here. For all other rules, refer to the Master.

---

## Page-Specific Rules

### Layout Overrides

- **Max Width:** 1200px (standard)
- **Layout:** Full-width sections, centered content
- **Sections:** 1. Full-screen interactive element, 2. Guided product tour, 3. Key benefits revealed, 4. CTA after completion

### Spacing Overrides

- No overrides — use Master spacing

### Typography Overrides

- No overrides — use Master typography

### Color Overrides

- **Strategy:** Immersive experience colors. Dark background for focus. Highlight interactive elements.

### Component Overrides

- Avoid: Only test on your device
- Avoid: Skip heading levels or misuse for styling
- Avoid: Div soup with no semantics

---

## Page-Specific Components

- No unique components for this page

---

## Recommendations

- Effects: Haptic feedback (vibration), voice guidance, focus indicators (4px+ ring), motion options, alt content, semantic
- Responsive: Test at 320 375 414 768 1024 1440
- Accessibility: Use sequential heading levels h1-h6
- Accessibility: Use semantic HTML and ARIA properly
- CTA Placement: After interaction complete + Skip option for impatient users
