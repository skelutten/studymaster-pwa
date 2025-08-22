// Input validation utilities

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export interface ValidationRule {
  test: (value: string) => boolean
  message: string
}

// Common validation rules
export const validationRules = {
  required: (message = 'This field is required'): ValidationRule => ({
    test: (value: string) => value.trim().length > 0,
    message
  }),
  
  minLength: (min: number, message?: string): ValidationRule => ({
    test: (value: string) => value.length >= min,
    message: message || `Must be at least ${min} characters long`
  }),
  
  maxLength: (max: number, message?: string): ValidationRule => ({
    test: (value: string) => value.length <= max,
    message: message || `Must be no more than ${max} characters long`
  }),
  
  email: (message = 'Please enter a valid email address'): ValidationRule => ({
    test: (value: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(value)
    },
    message
  }),
  
  password: (message = 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'): ValidationRule => ({
    test: (value: string) => {
      // At least 8 characters, one uppercase, one lowercase, one number, one special character
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
      return passwordRegex.test(value)
    },
    message
  }),
  
  username: (message = 'Username must be 3-50 characters and contain only letters, numbers, and underscores'): ValidationRule => ({
    test: (value: string) => {
      const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/
      return usernameRegex.test(value)
    },
    message
  }),
  
  noXSS: (message = 'Invalid characters detected'): ValidationRule => ({
    test: (value: string) => {
      // Basic XSS prevention - reject common script tags and javascript protocols
      const xssRegex = /<script|javascript:|data:|vbscript:|onload=|onerror=/i
      return !xssRegex.test(value)
    },
    message
  }),
  
  noSQLInjection: (message = 'Invalid characters detected'): ValidationRule => ({
    test: (value: string) => {
      // Basic SQL injection prevention
      const patterns = [
        /'/, // single quotes
        /\\'/, // escaped quotes
        /;/, // semicolons
        /--/, // SQL comments
        /\/\*/, // block comments start
        /(union|select|insert|delete|update|drop|create|alter|exec|execute)\s/i // SQL keywords
      ]
      const hasSQLInjection = patterns.some(pattern => pattern.test(value))
      return !hasSQLInjection
    },
    message
  })
}

// Validate a single field
export function validateField(value: string, rules: ValidationRule[]): ValidationResult {
  const errors: string[] = []
  
  for (const rule of rules) {
    if (!rule.test(value)) {
      errors.push(rule.message)
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Validate multiple fields
export function validateForm(data: Record<string, string>, rules: Record<string, ValidationRule[]>): Record<string, ValidationResult> {
  const results: Record<string, ValidationResult> = {}
  
  for (const [field, fieldRules] of Object.entries(rules)) {
    const value = data[field] || ''
    results[field] = validateField(value, fieldRules)
  }
  
  return results
}

// Check if all validation results are valid
export function isFormValid(results: Record<string, ValidationResult>): boolean {
  return Object.values(results).every(result => result.isValid)
}

// Sanitize input to prevent XSS
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim()
}

// Validate and sanitize text content
export function validateAndSanitizeText(text: string, maxLength = 5000): { isValid: boolean; sanitized: string; errors: string[] } {
  const validation = validateField(text, [
    validationRules.required(),
    validationRules.maxLength(maxLength),
    validationRules.noXSS(),
    validationRules.noSQLInjection()
  ])
  
  return {
    isValid: validation.isValid,
    sanitized: sanitizeInput(text),
    errors: validation.errors
  }
}

// Pre-defined validation schemas for common forms
export const validationSchemas = {
  signUp: {
    email: [validationRules.required(), validationRules.email()],
    password: [validationRules.required(), validationRules.password()],
    username: [validationRules.required(), validationRules.username()]
  },
  
  signIn: {
    email: [validationRules.required()],
    password: [validationRules.required(), validationRules.minLength(6)]
  },
  
  profile: {
    username: [validationRules.required(), validationRules.username()],
    email: [validationRules.required(), validationRules.email()]
  },
  
  card: {
    front_content: [validationRules.required(), validationRules.maxLength(5000), validationRules.noXSS()],
    back_content: [validationRules.required(), validationRules.maxLength(5000), validationRules.noXSS()]
  },
  
  deck: {
    title: [validationRules.required(), validationRules.maxLength(200), validationRules.noXSS()],
    description: [validationRules.maxLength(1000), validationRules.noXSS()]
  }
}