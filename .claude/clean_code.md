# 🧼 Clean Code Guidelines for AI Code Generators

> A distilled, AI-compatible guide based on Clean Code principles, SOLID, functional programming, and other CS best practices.

-----

## 📋 Table of Contents

1.  [General Principles](https://www.google.com/search?q=%23general-principles)
2.  [Naming Conventions](https://www.google.com/search?q=%23naming-conventions)
3.  [Functions](https://www.google.com/search?q=%23functions)
4.  [Comments](https://www.google.com/search?q=%23comments)
5.  [Formatting](https://www.google.com/search?q=%23formatting)
6.  [Objects and Data Structures](https://www.google.com/search?q=%23objects-and-data-structures)
7.  [Error Handling](https://www.google.com/search?q=%23error-handling)
8.  [Code Organization](https://www.google.com/search?q=%23code-organization)
9.  [Testing](https://www.google.com/search?q=%23testing)
10. [Concurrency](https://www.google.com/search?q=%23concurrency)
11. [Security](https://www.google.com/search?q=%23security)
12. [Performance](https://www.google.com/search?q=%23performance)
13. [SOLID Principles](https://www.google.com/search?q=%23solid-principles)
14. [Functional Programming Principles](https://www.google.com/search?q=%23functional-programming-principles)
15. [AI Code Generation Do’s and Don’ts](https://www.google.com/search?q=%23ai-code-generation-dos-and-donts)

-----

## 🧠 General Principles

  - Write code for **humans first, computers second**.
  - Prefer **readability over cleverness**.
  - Make code **self-explanatory** and **self-documenting**.
  - Code should tell a **story** without needing comments.
  - Functions, classes, and files should be **small and focused**.
  - Avoid duplication (**DRY** - Don’t Repeat Yourself).
  - Follow the **Principle of Least Astonishment**: code should behave as users expect.
  - Strive for **simplicity**: the simplest solution is often the best.

-----

## 🏷️ Naming Conventions

  - Use **descriptive names** that reveal intent.
      - ✅ `calculateMonthlyRevenue()`
      - ❌ `doStuff()`
  - Use **pronounceable** and **searchable** names.
  - Avoid **abbreviations** or single-letter identifiers (except loop counters in small scopes).
  - Class names: nouns (`InvoiceGenerator`, `UserRepository`)
  - Functions/Methods: verbs (`generateInvoice()`, `getUserById()`)
  - Booleans: start with `is`, `has`, `can`, `should` (e.g., `isActive`, `hasPermission`)
  - Constants: use `UPPER_SNAKE_CASE` (e.g., `MAX_RETRIES`).

-----

## 🔧 Functions

  - Functions should do **one thing**, and do it well (Single Responsibility Principle for functions).
  - Keep functions **small**: ideally under 20 lines, rarely over 50.
  - Prefer **pure functions** with no side effects when possible.
  - Use **descriptive names** instead of comments to explain function purpose.
  - Reduce the number of arguments (max 3, preferably 0–2).
  - Avoid flag arguments (e.g., `doSomething(true)` → split into two functions: `enableSomething()` and `disableSomething()`).
  - Functions should either **do something** (command) or **answer something** (query)—not both.
  - Encapsulate implementation details and complex logic within well-named functions.

-----

## 💬 Comments

  - Code should be **self-documenting**—use comments **only when necessary**.
  - Write comments that explain **why** something is done, not **what** is being done (which the code should convey).
  - Avoid redundant, obvious, or outdated comments.
  - Use **TODO**, **FIXME**, and **HACK** comments sparingly and with clear intent and context.
  - Prefer deleting unclear or misleading comments rather than maintaining lies.
  - Document public APIs (functions, classes) with brief, clear explanations of their purpose, arguments, and return values.

-----

## 🧱 Formatting

  - Follow a consistent indentation (2 or 4 spaces, never mixed). Configure your editor/IDE.
  - Keep code blocks vertically and horizontally small to minimize scrolling.
  - Use vertical spacing (blank lines) to separate concepts logically within a file or function.
  - Align related code blocks visually (e.g., variable declarations, array elements).
  - Adhere to a consistent maximum line length (e.g., 80-120 characters).
  - Place braces consistently (e.g., K\&R or Allman style).

-----

## 🧩 Objects and Data Structures

  - Expose **behavior**, not internal data (information hiding).
  - Prefer **immutable objects** when possible to prevent unexpected side effects.
  - Avoid exposing implementation details through getters/setters unless absolutely necessary; favor methods that perform actions.
  - Follow the **Law of Demeter**: A module should only talk to its immediate friends (objects it owns, arguments it receives, objects it creates, or objects directly accessed). Avoid "train wrecks" like `a.getB().getC().doSomething()`.
  - Classes should be **cohesive**, meaning their responsibilities are strongly related.
  - Differentiate between **data structures** (which expose data) and **objects** (which hide data and expose behavior).

-----

## 🚨 Error Handling

  - Use exceptions for exceptional conditions, not for normal flow control.
  - Throw exceptions with **contextual messages** that provide sufficient information for debugging (e.g., what happened, where, and why).
  - Avoid catching generic exceptions (`catch(Exception)` or `catch (Error)` without specific handling) as they can mask unexpected issues.
  - Handle errors **at the appropriate level**: Catch exceptions where you can genuinely recover or add meaningful context, not just to re-throw.
  - Don't return `null` or magic numbers for errors—use optional values (e.g., `Optional<T>`, `Maybe<T>`) or throw well-defined exceptions.
  - Implement graceful degradation where possible, allowing the system to continue functioning partially instead of crashing.

-----

## 📁 Code Organization

  - Organize files by **domain or feature**, not by type.
      - ✅ `src/invoices/generator.js`, `src/invoices/validator.js`
      - ❌ `src/services/invoice.js`, `src/utils/invoiceValidation.js`
  - Each file/class/module should have **a single, well-defined responsibility**.
  - Keep related code **physically close** within files and directories.
  - Use meaningful directory and file names.
  - Minimize dependencies between modules to reduce coupling.
  - Group related helper functions or utilities into dedicated modules.

-----

## 🧪 Testing

  - Write **automated tests** (unit, integration, end-to-end) for all critical code paths.
  - Tests should be **FAST**: **F**ast, **A**utomated, **S**elf-validating, **T**imely.
  - Follow the **FIRST** principles for unit tests: **F**ast, **I**solated, **R**epeatable, **S**elf-validating, **T**imely.
  - Design code to be **testable** by favoring dependency injection and avoiding global state.
  - Tests should be **readable** and **maintainable** just like production code.
  - Test edge cases, error conditions, and boundary values.
  - Aim for high **code coverage**, but prioritize meaningful tests over arbitrary coverage percentages.

-----

## 🚦 Concurrency

  - Minimize shared mutable state to avoid race conditions and deadlocks.
  - Use appropriate synchronization mechanisms (locks, semaphores, atomic operations) when shared state is unavoidable.
  - Prefer **immutable data structures** and **pure functions** in concurrent contexts.
  - Understand the implications of concurrency models (e.g., threads, async/await, actors).
  - Isolate concurrent operations into specific modules or components.
  - Be wary of common concurrency pitfalls like livelocks, starvation, and contention.

-----

## 🔒 Security

  - Validate all **user inputs**: never trust data from external sources.
  - Sanitize and escape outputs to prevent injection attacks (e.g., XSS, SQL injection).
  - Use secure communication protocols (HTTPS, SSH).
  - Implement strong authentication and authorization mechanisms.
  - Follow the **Principle of Least Privilege**: grant only the necessary permissions.
  - Regularly update dependencies to patch known vulnerabilities.
  - Encrypt sensitive data both in transit and at rest.
  - Avoid hardcoding sensitive information (e.g., API keys, passwords).

-----

## ⚡ Performance

  - Optimize for **clarity and correctness** first, then for performance if necessary.
  - Measure performance bottlenecks with profiling tools before optimizing.
  - Avoid premature optimization; it often leads to complex, less readable code.
  - Choose appropriate data structures and algorithms for the problem.
  - Minimize I/O operations (disk, network) and expensive computations.
  - Implement caching strategies for frequently accessed data.
  - Be mindful of memory usage and avoid unnecessary object creation.

-----

## 🧱 SOLID Principles

### S — Single Responsibility Principle

Every module, class, or function should have **one reason to change**.

### O — Open/Closed Principle

Software entities should be **open for extension, but closed for modification**. You should be able to add new functionality without altering existing, working code.

### L — Liskov Substitution Principle

Subtypes must be **substitutable** for their base types without breaking the correctness of the program. If `S` is a subtype of `T`, then objects of type `T` may be replaced with objects of type `S` without altering any of the desirable properties of the program.

### I — Interface Segregation Principle

Clients should not be forced to depend on **interfaces they do not use**. Favor many small, client-specific interfaces over one large, general-purpose interface.

### D — Dependency Inversion Principle

Depend on **abstractions, not concrete implementations**. High-level modules should not depend on low-level modules; both should depend on abstractions. Abstractions should not depend on details; details should depend on abstractions.

-----

## 🧮 Functional Programming Principles

  - Avoid **shared mutable state** by default.
  - Prefer **pure functions**: given the same input, they always return the same output and produce no side effects.
  - Use **higher-order functions** (functions that take or return other functions) and **composition** for building complex logic from simpler parts.
  - Embrace **immutability**: once data is created, it cannot be changed. New data is created instead.
  - Use **map/filter/reduce** (or similar constructs like `forEach`, `flatMap`) over traditional loops when appropriate for transforming and aggregating collections.
  - Treat functions as **first-class citizens** that can be passed as arguments, returned from other functions, and assigned to variables.

-----

## 🤖 AI Code Generation Do’s and Don’ts

| ✅ Do This                                | ❌ Avoid This                             |
| :---------------------------------------- | :---------------------------------------- |
| Write small, focused functions            | Create "god" functions (`doAllThings()`) |
| Use meaningful variable and function names | Use single-letter or cryptic names      |
| Prefer composition over inheritance       | Overuse deep inheritance hierarchies    |
| Write pure, side-effect-free code         | Rely on global mutable variables        |
| Comment intent only when needed           | Comment every line or redundant info     |
| Follow consistent naming conventions      | Mix styles and cases randomly             |
| Use clear structure and logical layout    | Write long, unbroken blocks of logic    |
| Write testable, decoupled code            | Mix concerns (e.g., DB and UI logic)      |
| Provide specific, clear prompts           | Use vague or ambiguous prompts            |
| Iterate on generated code and refactor    | Blindly accept generated code             |
| Understand the generated code thoroughly  | Treat AI as a black box                   |
| Ask for multiple solutions to compare     | Settle for the first solution             |
| Leverage AI for boilerplate and patterns  | Expect AI to solve complex design issues  |

-----

## 📚 Sources

  - *Clean Code* – Robert C. Martin
  - *Refactoring: Improving the Design of Existing Code* – Martin Fowler
  - *The Pragmatic Programmer: From Journeyman to Master* – Andrew Hunt & David Thomas
  - *Structure and Interpretation of Computer Programs (SICP)* – Harold Abelson & Gerald Jay Sussman
  - *Functional Programming Principles in Scala* – Martin Odersky
  - SOLID Principles – Robert C. Martin (Uncle Bob), Alistair Cockburn
  - *Design Patterns: Elements of Reusable Object-Oriented Software* – Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides (Gang of Four)
  - *Code Complete* – Steve McConnell

-----
