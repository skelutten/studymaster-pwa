Here's an improved version of your "AI-Safe Secure Coding Guidelines," focusing on better formatting, clarity, and an enhanced structure for easier readability and more effective guidance for AI code generation.

-----

# 🔐 AI-Safe Secure Coding Guidelines

> **Comprehensive rules for secure software development, curated specifically for AI-based code generation.**
>
> **Based on leading security standards:** OWASP, CERT, IEC 62443, HIPAA, NSA, BSI, and the EU Cybersecurity Framework.

-----

## 📋 Table of Contents

1.  [General Secure Coding Principles](https://www.google.com/search?q=%231-general-secure-coding-principles)
2.  [Language-Specific Best Practices](https://www.google.com/search?q=%232-language-specific-best-practices)
      * [Python](https://www.google.com/search?q=%23python)
      * [JavaScript](https://www.google.com/search?q=%23javascript)
      * [TypeScript](https://www.google.com/search?q=%23typescript)
      * [C / C++](https://www.google.com/search?q=%23c--c)
3.  [AI Coding Best Practices: Do's and Don'ts](https://www.google.com/search?q=%233-ai-coding-best-practices-dos-and-donts)
4.  [Recommended Security Tooling](https://www.google.com/search?q=%234-recommended-security-tooling)
5.  [Compliance Mapping](https://www.google.com/search?q=%235-compliance-mapping)
6.  [Secure Deployment & Repository Practices](https://www.google.com/search?q=%236-secure-deployment--repository-practices)

-----

## 1\. General Secure Coding Principles

These principles form the foundation of secure software development and must be rigorously applied by AI code generators.

### **1.1 Input Validation & Output Encoding**

  * **Whitelist Validation:** Always use **whitelist validation** for all inputs. Define what *is* allowed, rather than trying to block what *isn't*.
  * **Contextual Encoding:** Escape and encode all output based on its context (e.g., HTML, JavaScript, SQL). This prevents injection attacks.
  * **Parameterized Queries:** Never use string concatenation for database queries. Always use **parameterized queries** or prepared statements to prevent SQL Injection.
  * **Server-Side Trust:** Never trust data received from the client-side; always re-validate and sanitize it on the server.

### **1.2 Authentication & Session Management**

  * **Strong Password Hashing:** Hash passwords using modern, robust algorithms like **bcrypt**, **Argon2**, or **PBKDF2**. Include a unique salt for each password.
  * **Secure Sessions:** Implement secure session management using `httpOnly`, `Secure`, and `SameSite=Strict` cookies.
  * **Session Control:** Enforce appropriate session timeouts and invalidate sessions upon logout or inactivity.
  * **Secret Management:** Store sensitive credentials and API keys in environment variables or a dedicated secret management system, **never** directly in source code.

### **1.3 Authorization & Access Control**

  * **Access Models:** Implement robust authorization models such as **Role-Based Access Control (RBAC)** or **Attribute-Based Access Control (ABAC)**.
  * **Server-Side Enforcement:** Always enforce authorization checks on the server-side. Client-side authorization is easily bypassed.
  * **Deny-by-Default:** Adopt a **deny-by-default** policy, granting only explicitly defined permissions.
  * **Secure Tokens:** Use short-lived, cryptographically signed JWTs or access tokens. Validate token signatures and expiration on every request.

### **1.4 Data Protection**

  * **Encryption at Rest:** Encrypt sensitive data when stored (at rest) using strong algorithms like **AES-256**.
  * **Encryption in Transit:** Ensure all data communicated over networks is encrypted (in transit) using **TLS 1.2 or higher**.
  * **Data Integrity:** Use **HMAC** (Hash-based Message Authentication Code) to verify data integrity and authenticity.
  * **No Sensitive Logging:** Avoid logging sensitive data such as passwords, Personally Identifiable Information (PII), or payment details.
  * **Secure Randomness:** Utilize cryptographically secure pseudo-random number generators (CSPRNGs) for generating tokens, salts, and other security-critical values.

### **1.5 Security Headers & Testing**

  * **Security Headers:** Enable crucial HTTP security headers to mitigate common web vulnerabilities:
      * `Content-Security-Policy`: Prevent XSS and data injection attacks.
      * `X-Frame-Options: DENY`: Prevent clickjacking.
      * `Strict-Transport-Security`: Enforce HTTPS connections.
      * `X-Content-Type-Options: nosniff`: Prevent MIME type sniffing vulnerabilities.
      * `Referrer-Policy`: Control referrer information sent with requests.
  * **Static Analysis:** Integrate and act on findings from static application security testing (SAST) tools (e.g., Semgrep, SonarQube).
  * **Dependency Scanning:** Regularly scan and update third-party dependencies for known vulnerabilities using tools like `npm audit`, `pip-audit`, or Snyk.

-----

## 2\. Language-Specific Best Practices

These rules provide tailored guidance for secure coding within specific programming languages.

### **Python**

  * **Secure Randomness:** Always use the `secrets` module or `os.urandom()` for cryptographic randomness. Avoid `random` module for security-sensitive operations.
  * **Parameterized SQL:** When interacting with databases, strictly use parameterized queries:
    ```python
    # Correct: Uses parameterized query
    cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
    ```
  * **Code Execution Avoidance:** Never use `eval()`, `exec()`, or `pickle` with untrusted input due to severe security risks.
  * **Dependency Management:** Utilize virtual environments (`venv` or `conda`) and pin all dependencies in `requirements.txt` to specific versions for reproducibility and security.

### **JavaScript**

  * **Dynamic Code Execution:** Avoid `eval()`, `new Function()`, and `setTimeout()`/`setInterval()` when their arguments are derived from untrusted input.
  * **DOM Manipulation:** Use `textContent` instead of `innerHTML` when inserting user-generated text into the DOM to prevent XSS.
  * **Secure Cookies:** Always set `httpOnly`, `Secure`, and `SameSite=Strict` flags for session cookies:
    ```javascript
    res.cookie('sid', token, { httpOnly: true, secure: true, sameSite: 'strict' });
    ```
  * **Prototype Pollution Prevention:** Implement checks to prevent prototype pollution attacks when merging or processing untrusted objects:
    ```javascript
    if (Object.hasOwn(obj, key)) { /* ... process key ... */ }
    ```

### **TypeScript**

  * **Type Safety:** Minimize the use of the `any` type. Validate untrusted JSON payloads rigorously using schema validation libraries like `zod` or `ajv`.
  * **Immutability & Strictness:** Prefer `readonly` properties and `const` declarations. Enable and adhere to TypeScript's strict mode (`"strict": true` in `tsconfig.json`).
  * **Security Linting:** Integrate and follow recommendations from security-focused ESLint plugins (e.g., `eslint-plugin-security`).
  * **DOM Manipulation (Client-side):** Avoid direct DOM manipulation with content originating from untrusted sources without proper sanitization.

### **C / C++**

  * **Safe String Functions:** Prefer `snprintf`, `fgets`, `strncpy` over their unsafe counterparts (`sprintf`, `gets`, `strcpy`) to prevent buffer overflows.
  * **Compiler Hardening:** Always compile with security flags such as:
    ```diff
    -fstack-protector-strong -D_FORTIFY_SOURCE=2 -O2
    ```
  * **Bounds Checking:** Consistently check array and pointer bounds before access or manipulation.
  * **Memory Allocation Checks:** Always verify the return values of `malloc()` and similar memory allocation functions to handle allocation failures gracefully.
  * **Buffer Overflow Prevention:** Never allow unchecked buffer copies; ensure destination buffers are large enough or use size-limited functions.

-----

## 3\. AI Coding Best Practices: Do's and Don'ts

This section provides clear instructions for AI models generating code, emphasizing secure patterns.

| ✅ **Do This** | ❌ **Avoid This** |
| :----------------------------------------- | :------------------------------------------------- |
| Use parameterized SQL for database queries | Concatenate raw user input directly into SQL queries |
| Escape and encode all output (HTML, JS, etc.) | Insert raw HTML or JavaScript into the DOM        |
| Use cryptographically secure randomness (`secrets`, `os.urandom()`) | Use `random` module or weak hashes like MD5/SHA1   |
| Integrate and use static analysis tools      | Trust user input or external data blindly          |
| Implement and harden HTTP security headers  | Expose detailed stack traces or server version info |
| Use secure, signed JWTs / access tokens     | Accept unsigned or unvalidated authentication tokens |
| Validate input using whitelist approaches   | Rely solely on blacklist validation                 |
| Employ least privilege principles           | Grant excessive permissions by default             |

-----

## 4\. Recommended Security Tooling

Leverage these tools throughout the development lifecycle to enforce security.

| Purpose                  | Tools                                         |
| :----------------------- | :-------------------------------------------- |
| **Static Analysis (SAST)** | Semgrep, SonarQube, Bandit (Python), ESLint   |
| **Dependency Scanning** | Snyk, OWASP Dependency-Check, pip-audit       |
| **Secret Scanning** | TruffleHog, GitLeaks                          |
| **Linting & Type Checking** | ESLint, MyPy (Python), Flake8 (Python), Cppcheck (C/C++) |
| **Fuzz Testing** | libFuzzer, AFL, Peach Fuzzer                  |
| **Dynamic Analysis (DAST)** | OWASP ZAP, Burp Suite                         |
| **Container Scanning** | Trivy, Clair                                  |

-----

## 5\. Compliance Mapping

Secure coding practices are essential for meeting various regulatory and industry standards.

| Secure Practice               | Relevant Standard / Framework                           |
| :---------------------------- | :------------------------------------------------------ |
| SQL Injection Protection      | OWASP A1 (Injection), CERT C/C++                        |
| Strong Password Hashing       | OWASP (Authentication), NIST 800-63, HIPAA              |
| HTTPS and Secure Cookies      | OWASP SCPS, BSI TR-02102, EU Cybersecurity Framework    |
| Role-Based Access Control     | IEC 62443-3-3 SR1.1, SR1.2                              |
| Least Privilege / Secrets Mgmt | NSA Cybersecurity Guidance, EU Cybersecurity Framework  |
| Data Encryption (Rest/Transit)| HIPAA, GDPR, ISO 27001                                  |
| Input Validation              | OWASP A03 (Injection), CERT Secure Coding Standards     |

-----

## 6\. Secure Deployment & Repository Practices

Security extends beyond code to how it's managed and deployed.

### **6.1 Git Repository Security**

  * **History Sanitization:** All sensitive data (e.g., credentials, private keys) must be permanently removed from Git history using tools like `git filter-repo` (preferred over `git filter-branch`).
  * **Credential Exclusion:** Production credentials and sensitive configuration files (e.g., `.env.production`, `config.json` with secrets) must be explicitly excluded from version control using comprehensive `.gitignore` patterns.
  * **Secret Scanning:** Continuously scan repositories for accidental secret leaks using tools like TruffleHog or GitLeaks.

### **6.2 Secure Deployment Rules**

1.  **Local Verification:** Always build and test applications locally to verify functionality and catch potential issues before deployment.
2.  **Automated Deployment:** Utilize secure, automated deployment pipelines (e.g., Vercel CLI, Git integration, CI/CD pipelines) to minimize human error and ensure consistency.
3.  **Environment Variable Management:** Configure environment variables through secure interfaces provided by your deployment platform (e.g., Vercel Dashboard UI, Kubernetes Secrets, AWS Secrets Manager). **Never** hardcode or commit credentials directly into deployment configurations or Git.
4.  **Database & Service Configuration:** Manage database and authentication configurations (e.g., Supabase Dashboard) through their respective secure dashboards or APIs, not via application code.
