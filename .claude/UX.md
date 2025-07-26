## AI Code Generation Guidelines for UX/GUI/Design Systems

To guide an AI in writing UI code that adheres to best practices and delivers a superior user experience, these principles must be rigorously applied:

### 1. **Strict Adherence to Design System Tokens and Components**

Always prioritize the official **design system** as the single source of truth.
* **Tokens:** Explicitly reference and use the design system's defined style variables (e.g., `var(--color-brand-primary)`, `var(--spacing-medium)`, `var(--font-family-body)`). Never hardcode values like hex colors, pixel values for spacing, or specific font names.
* **Components:** Utilize the design system's pre-built and documented UI components (e.g., `<Button variant="primary">`, `<Input type="text" label="Username">`). Do not create custom components that duplicate functionality or styling already provided by the design system.
* **Versioning:** Account for design system versioning. The AI should be able to specify or infer the correct version of the design system being used to ensure compatibility and prevent breaking changes.

### 2. **Comprehensive Accessibility Integration**

Accessibility (A11y) is not an add-on; it's fundamental.
* **Semantic HTML:** Generate code using appropriate HTML5 semantic elements (e.g., `<header>`, `<nav>`, `<main>`, `<footer>`, `<article>`, `<section>`, `<aside>`, `<figure>`, `<figcaption>`). Avoid excessive use of generic `<div>` elements when a more semantic tag is available.
* **ARIA Attributes:** Implement ARIA attributes judiciously where native HTML semantics are insufficient (e.g., `aria-label`, `aria-describedby`, `aria-live`, `aria-expanded`). Ensure correct roles, states, and properties are applied.
* **Keyboard Navigation:** All interactive elements must be keyboard accessible and have a clear, visible focus indicator. Ensure logical tab order (`tabindex`) is maintained.
* **Alternative Text:** Provide meaningful `alt` text for all `<img>` elements. For decorative images, use `alt=""`. For complex images (charts, graphs), provide a concise `alt` description and a more detailed explanation nearby or via `aria-describedby`.
* **Form Labels:** Associate all form inputs with explicit `<label>` elements using the `for` and `id` attributes. Placeholder text is not a substitute for a label.
* **Heading Structure:** Maintain a logical and hierarchical heading structure (`<h1>` through `<h6>`) to outline content and aid screen reader navigation. Ensure only one `<h1>` per page.
* **Color Contrast:** All text and interactive elements must meet WCAG AA or AAA contrast requirements (e.g., 4.5:1 for small text, 3:1 for large text and graphical objects).
* **Motion and Animation:** Provide options to reduce or disable animations for users sensitive to motion (e.g., using `prefers-reduced-motion` media query).
* **Internationalization (i18n):** Ensure code supports localization and internationalization, including text direction (RTL/LTR), date/time formats, and numerical systems.

### 3. **Clear and Consistent Visual Hierarchy**

The visual presentation must guide the user's eye and understanding.
* **Emphasis:** Apply appropriate styling (e.g., font size, weight, color from design tokens) to reflect the importance of content. Main titles should be visually dominant, followed by subtitles, and then body text.
* **Information Prioritization:** Arrange content such that the most critical information is presented first or in the most prominent positions within a section.
* **Spacing for Grouping:** Utilize spacing (padding and margin, derived from design tokens) to visually group related elements and separate unrelated ones, leveraging the **Law of Proximity**.
* **Visual Cues for Interactivity:** Clearly differentiate interactive elements (buttons, links) from static content through visual cues like color, underlines, or hover states defined in the design system.

### 4. **Standardized Naming Conventions and Patterns**

Predictability in naming enhances maintainability and user intuition.
* **Design System Naming:** Adhere strictly to the naming conventions for components, classes, IDs, and variables defined within the design system (e.g., `primary-button`, `input-field`, `card-container`).
* **BEM/CSS Modules/Styled Components:** If a specific CSS methodology is in use (e.g., BEM, CSS Modules, or patterns within Styled Components), the AI must generate code consistent with that methodology for class naming and structure.
* **Component Composition:** When building more complex UI, favor composition of existing design system components over custom, one-off implementations.

### 5. **Precise Spacing and Layout System Application**

Layout must be systematic and consistent across the interface.
* **Grid System:** Implement the design system's established grid system (e.g., 12-column grid, CSS Grid, Flexbox layouts) to align elements and create predictable layouts.
* **Spacing Scale:** Apply spacing (margins, paddings, gaps) exclusively using values from the design system's spacing scale (e.g., multiples of 4px, 8px, or 10px). Avoid arbitrary pixel values.
* **Component-Level Spacing:** Ensure components maintain their internal spacing as defined by the design system, and that external spacing between components follows the system's rules.

### 6. **Robust Typography Rules**

Text must be readable, legible, and visually harmonious.
* **System Fonts Only:** Limit font choices to only those specified within the design system. Do not introduce external fonts or variations.
* **Base Font Size:** Ensure the base font size for body text is at least 16px for optimal readability across devices.
* **Line Length (Measure):** Aim for line lengths between 45 and 75 characters per line (ideally around 60-70 characters) for body text to improve readability.
* **Line Height (Leading):** Apply the design system's defined line-height values (e.g., 1.4x to 1.8x the font size) to text blocks for optimal legibility.
* **Text Hierarchy:** Use different font sizes, weights, and styles (from design system tokens) to create a clear typographic hierarchy, guiding the user through the content.
* **Whitespace:** Ensure sufficient whitespace around text blocks to prevent an overcrowded or dense appearance.
* **Text Truncation:** Implement graceful text truncation with ellipses or tooltips when content exceeds available space, following design system guidelines.

### 7. **Immediate and Informative Feedback & Interactivity**

Users need clear signals about system status and interaction outcomes.
* **Visual Feedback:** Provide immediate visual feedback for all user interactions (e.g., hover states, active states, focus states for buttons, links, and inputs).
* **Loading Indicators:** Display clear loading spinners, progress bars, or skeleton screens for any action that takes more than ~100ms. Indicate if data is being fetched or an operation is in progress.
* **Status Messages:** Use toast notifications, banners, or inline messages to inform users about the success, failure, or progress of an action. Messages should be clear, concise, and actionable where appropriate.
* **Error Prevention & Recovery:**
    * **Disable Buttons:** Disable submit buttons or other interactive elements while a process is running to prevent duplicate submissions.
    * **Input Validation:** Provide real-time, inline validation feedback for form inputs (e.g., "Email is invalid," "Password must contain 8 characters").
    * **Undo/Redo:** For destructive or complex actions, provide an easy way to undo or cancel the operation.
    * **Clear Error Messages:** Error messages should be user-friendly, explain *what* went wrong, and suggest *how* to fix it.
* **Confirmation:** For critical or destructive actions (e.g., deleting an account), prompt for user confirmation.

### 8. **Purposeful Minimalism and Clarity**

Every element on the screen should serve a clear purpose.
* **Reduce Clutter:** Omit any UI element, text, or visual noise that does not directly support the user's current task or understanding.
* **Content-First:** Prioritize content over excessive ornamentation or unnecessary UI chrome.
* **Progressive Disclosure:** Present only essential information initially and allow users to access more details on demand (e.g., through accordions, tooltips, or dedicated detail pages).
* **Cognitive Load:** Minimize cognitive load by simplifying choices, providing clear navigation, and avoiding ambiguous terminology.

### 9. **Responsive, Adaptive, and Context-Aware Design**

The UI must perform optimally across diverse devices and scenarios.
* **Breakpoints & Fluid Grids:** Generate code that utilizes the design system's defined breakpoints to adapt layouts, typography, and component behavior for different screen sizes (mobile, tablet, desktop). Use fluid layouts where appropriate.
* **Flexible Components:** Ensure components are designed and coded to be flexible and scale gracefully within different containers and screen sizes.
* **Touch Targets:** For touch interfaces (mobile/tablet), ensure interactive elements (buttons, links) have sufficiently large touch targets (minimum 48x48px recommended by WCAG).
* **Input Types:** Use appropriate HTML input types (e.g., `type="email"`, `type="tel"`, `type="date"`) to optimize the on-screen keyboard for mobile users.
* **Performance Optimization:** Generate lean and efficient code. Consider lazy loading images, optimizing animations, and minimizing render-blocking resources for faster load times on all devices, especially mobile.
* **Platform Conventions:** When applicable, consider platform-specific UI conventions (e.g., iOS vs. Android navigation patterns) if the design system supports such variations.

### 10. **Code Quality and Maintainability**

The generated code must be clean, readable, and easy to maintain by human developers.
* **Readability:** Generate well-formatted, indented, and commented code.
* **Modularity:** Create modular and reusable code components, aligning with component-based architectures (e.g., React, Vue, Web Components).
* **Performance:** Optimize for rendering performance and efficient DOM manipulation. Avoid unnecessary re-renders or layout thrashing.
* **Browser Compatibility:** Generate code that is compatible with target browser versions, potentially using polyfills or transpilation where necessary.
* **Security:** Avoid common security vulnerabilities like XSS by properly sanitizing user inputs.

---

By systematically enforcing these comprehensive guidelines – drawing from established UX heuristics, accessibility standards, and the chosen design system’s rules – the AI-generated UI code will not only be clear, consistent, and user-friendly, but also robust, accessible, and maintainable.