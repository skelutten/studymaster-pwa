import { describe, it, expect } from 'vitest'
import { validationRules } from '../validation'

describe('Validation Regex Fix', () => {
  describe('noSQLInjection validation rule', () => {
    it('should allow safe input strings', () => {
      const rule = validationRules.noSQLInjection()
      
      // Safe inputs
      expect(rule.test('Hello World')).toBe(true)
      expect(rule.test('user@example.com')).toBe(true)
      expect(rule.test('Valid password 123')).toBe(true)
      expect(rule.test('正常输入')).toBe(true) // Non-English characters
      expect(rule.test('Some-safe_input.123')).toBe(true)
    })

    it('should block SQL injection attempts', () => {
      const rule = validationRules.noSQLInjection()
      
      // SQL injection patterns
      expect(rule.test("'; DROP TABLE users; --")).toBe(false)
      expect(rule.test("admin' OR '1'='1")).toBe(false)
      expect(rule.test("user'; DELETE FROM accounts; --")).toBe(false)
      expect(rule.test("1' UNION SELECT * FROM passwords")).toBe(false)
      expect(rule.test("'; INSERT INTO malicious VALUES")).toBe(false)
      expect(rule.test("test'; UPDATE users SET")).toBe(false)
      expect(rule.test("'; CREATE TABLE evil")).toBe(false)
      expect(rule.test("'; ALTER TABLE users")).toBe(false)
      expect(rule.test("'; EXEC xp_cmdshell")).toBe(false)
      expect(rule.test("'; EXECUTE sp_configure")).toBe(false)
    })

    it('should block SQL comment patterns', () => {
      const rule = validationRules.noSQLInjection()
      
      expect(rule.test("test -- comment")).toBe(false)
      expect(rule.test("input /* block comment */")).toBe(false)
      expect(rule.test("value;-- malicious")).toBe(false)
    })

    it('should block semicolon patterns', () => {
      const rule = validationRules.noSQLInjection()
      
      expect(rule.test("value; DROP")).toBe(false)
      expect(rule.test("test\\; escaped")).toBe(false)
    })

    it('should handle escaped quotes correctly', () => {
      const rule = validationRules.noSQLInjection()
      
      // These should be blocked
      expect(rule.test("test\\' escaped quote")).toBe(false)
      expect(rule.test("input\\' malicious")).toBe(false)
      
      // Regular quotes should be blocked for SQL injection prevention
      expect(rule.test("I'm a normal user")).toBe(false)
      expect(rule.test('Say "hello" to the world')).toBe(true)
    })

    it('should be case insensitive for SQL keywords', () => {
      const rule = validationRules.noSQLInjection()
      
      expect(rule.test("'; union select")).toBe(false)
      expect(rule.test("'; UNION SELECT")).toBe(false)
      expect(rule.test("'; Union Select")).toBe(false)
      expect(rule.test("'; drop table")).toBe(false)
      expect(rule.test("'; DROP TABLE")).toBe(false)
    })

    it('should return custom error message', () => {
      const customMessage = 'Custom SQL injection warning'
      const rule = validationRules.noSQLInjection(customMessage)
      
      expect(rule.message).toBe(customMessage)
    })

    it('should have default error message', () => {
      const rule = validationRules.noSQLInjection()
      
      expect(rule.message).toBe('Invalid characters detected')
    })
  })
})