import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { SecureRenderer } from '../SecureRenderer'
import { SanitizationResult } from '../../../../../shared/types/anki'

describe('SecureRenderer', () => {
  let renderer: SecureRenderer

  beforeEach(() => {
    renderer = new SecureRenderer()
  })

  afterEach(() => {
    renderer.cleanup()
  })

  describe('HTML Sanitization', () => {
    test('should sanitize basic HTML while preserving safe content', async () => {
      const html = '<p>Safe content</p><strong>Bold text</strong>'
      const result = await renderer.sanitizeAnkiTemplate(html)

      expect(result.sanitizedHtml).toBe('<p>Safe content</p><strong>Bold text</strong>')
      expect(result.isSecure).toBe(true)
      expect(result.securityWarnings).toHaveLength(0)
    })

    test('should remove dangerous script tags', async () => {
      const html = '<p>Safe content</p><script>alert("XSS")</script>'
      const result = await renderer.sanitizeAnkiTemplate(html)

      expect(result.sanitizedHtml).not.toContain('<script>')
      expect(result.sanitizedHtml).not.toContain('alert')
      expect(result.isSecure).toBe(false)
      expect(result.securityWarnings.some(w => w.includes('script'))).toBe(true)
    })

    test('should remove dangerous event handlers', async () => {
      const html = '<div onclick="alert(\'XSS\')">Click me</div>'
      const result = await renderer.sanitizeAnkiTemplate(html)

      expect(result.sanitizedHtml).not.toContain('onclick')
      expect(result.sanitizedHtml).not.toContain('alert')
      expect(result.isSecure).toBe(false)
      expect(result.securityWarnings.some(w => w.includes('event handler'))).toBe(true)
    })

    test('should remove dangerous iframe sources', async () => {
      const html = '<iframe src="javascript:alert(\'XSS\')"></iframe>'
      const result = await renderer.sanitizeAnkiTemplate(html)

      expect(result.sanitizedHtml).not.toContain('javascript:')
      expect(result.isSecure).toBe(false)
      expect(result.securityWarnings.some(w => w.includes('iframe'))).toBe(true)
    })

    test('should preserve Anki template placeholders', async () => {
      const html = '<div>{{Front}}</div><div>{{#Note}}{{Back}}{{/Note}}</div>'
      const result = await renderer.sanitizeAnkiTemplate(html)

      expect(result.sanitizedHtml).toContain('{{Front}}')
      expect(result.sanitizedHtml).toContain('{{#Note}}')
      expect(result.sanitizedHtml).toContain('{{Back}}')
      expect(result.sanitizedHtml).toContain('{{/Note}}')
      expect(result.isSecure).toBe(true)
    })

    test('should preserve Anki cloze deletions', async () => {
      const html = '<div>The capital of France is {{c1::Paris}}</div>'
      const result = await renderer.sanitizeAnkiTemplate(html)

      expect(result.sanitizedHtml).toContain('{{c1::Paris}}')
      expect(result.isSecure).toBe(true)
    })

    test('should handle CSS with dangerous content', async () => {
      const html = '<div style="background: url(javascript:alert(\'XSS\'))">Content</div>'
      const result = await renderer.sanitizeAnkiTemplate(html)

      expect(result.sanitizedHtml).not.toContain('javascript:')
      expect(result.isSecure).toBe(false)
      expect(result.securityWarnings.some(w => w.includes('CSS'))).toBe(true)
    })

    test('should preserve safe CSS styles', async () => {
      const html = '<div style="color: red; font-weight: bold;">Content</div>'
      const result = await renderer.sanitizeAnkiTemplate(html)

      expect(result.sanitizedHtml).toContain('color: red')
      expect(result.sanitizedHtml).toContain('font-weight: bold')
      expect(result.isSecure).toBe(true)
    })

    test('should handle malformed HTML gracefully', async () => {
      const html = '<div><p>Unclosed tags<span>More content</div>'
      const result = await renderer.sanitizeAnkiTemplate(html)

      expect(result.sanitizedHtml).toContain('More content')
      expect(result.isSecure).toBe(true)
    })


    test('should handle empty or null input', async () => {
      expect(await renderer.sanitizeAnkiTemplate('')).toMatchObject({
        sanitizedHtml: '',
        isSecure: true,
        securityWarnings: []
      })

      expect(await renderer.sanitizeAnkiTemplate(null as any)).toMatchObject({
        sanitizedHtml: '',
        isSecure: true,
        securityWarnings: []
      })
    })
  })

  describe('Anki Card Rendering', () => {
    const mockModel = {
      id: 'test-model',
      name: 'Test Model',
      css: '.card { color: blue; }',
      securityLevel: 'moderate' as const
    }

    const mockTemplate = {
      id: 'test-template',
      name: 'Test Template',
      questionFormat: '<div class="front">{{Front}}</div>',
      answerFormat: '<div class="back">{{Back}}</div>'
    }

    test('should render basic card with template substitution', async () => {
      const fieldData = { Front: 'Test question' }
      const result = await renderer.renderAnkiCard(mockModel, mockTemplate, fieldData, 'question')

      expect(result.sanitizedHtml).toContain('Test question')
      expect(result.isSecure).toBe(true)
    })

    test('should handle cloze deletion rendering', async () => {
      const fieldData = { Text: 'The capital of France is {{c1::Paris}}' }
      const templateWithCloze = {
        ...mockTemplate,
        questionFormat: '<div>{{cloze:Text}}</div>'
      }
      const result = await renderer.renderAnkiCard(mockModel, templateWithCloze, fieldData, 'question')

      expect(result.sanitizedHtml).toContain('cloze-deletion')
      expect(result.isSecure).toBe(true)
    })

    test('should sanitize dangerous content in field data', async () => {
      const fieldData = { Front: '<script>alert("XSS")</script>Safe content' }
      const result = await renderer.renderAnkiCard(mockModel, mockTemplate, fieldData, 'question')

      expect(result.sanitizedHtml).not.toContain('<script>')
      expect(result.sanitizedHtml).toContain('Safe content')
      expect(result.isSecure).toBe(false)
      expect(result.securityWarnings.some(w => w.includes('script'))).toBe(true)
    })

    test('should handle missing field data gracefully', async () => {
      const templateWithBack = {
        ...mockTemplate,
        questionFormat: '<div>{{Front}} - {{Back}}</div>'
      }
      const fieldData = { Front: 'Question' } // Missing Back field
      const result = await renderer.renderAnkiCard(mockModel, templateWithBack, fieldData, 'question')

      expect(result.sanitizedHtml).toContain('Question')
      expect(result.sanitizedHtml).toContain('{{Back}}') // Should remain as placeholder
      expect(result.isSecure).toBe(true)
    })

    test('should apply CSS styles from model', async () => {
      const modelWithCss = {
        ...mockModel,
        css: '.card { color: blue; background: red; }'
      }
      const fieldData = { Front: 'Content' }
      const result = await renderer.renderAnkiCard(modelWithCss, mockTemplate, fieldData, 'question')

      // CSS is included in the rendering context but not directly in sanitizedHtml
      expect(result.sanitizedHtml).toContain('Content')
      expect(result.isSecure).toBe(true)
    })

    test('should sanitize dangerous CSS from model', async () => {
      const modelWithDangerousCss = {
        ...mockModel,
        css: '.card { background: url(javascript:alert("XSS")); }'
      }
      const fieldData = { Front: 'Content' }
      const result = await renderer.renderAnkiCard(modelWithDangerousCss, mockTemplate, fieldData, 'question')

      expect(result.isSecure).toBe(false)
      expect(result.securityWarnings.some(w => w.includes('CSS') || w.includes('JavaScript'))).toBe(true)
    })
  })

  describe('Security Features', () => {
    test('should detect XSS attempts in various formats', async () => {
      const xssAttempts = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(\'XSS\')">',
        '<div onclick="alert(\'XSS\')">Click</div>',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>',
        '<link rel="stylesheet" href="javascript:alert(\'XSS\')">',
        '<style>body { background: url(javascript:alert("XSS")); }</style>',
        '<svg><script>alert("XSS")</script></svg>',
        '<object data="javascript:alert(\'XSS\')"></object>'
      ]

      for (const html of xssAttempts) {
        const result = await renderer.sanitizeAnkiTemplate(html)
        expect(result.isSecure).toBe(false)
        expect(result.securityWarnings.length).toBeGreaterThan(0)
        expect(result.sanitizedHtml).not.toContain('alert')
      }
    })

    test('should detect potential phishing attempts', async () => {
      const phishingHtml = '<a href="http://evil.com" onclick="window.location=\'http://phishing.com\'">Legitimate Link</a>'
      const result = await renderer.sanitizeAnkiTemplate(phishingHtml)

      expect(result.isSecure).toBe(false)
      expect(result.securityWarnings.some(w => w.includes('external link') || w.includes('event handler'))).toBe(true)
    })

    test('should handle Unicode-based XSS attempts', async () => {
      const unicodeXss = '<script>alert(\u0022XSS\u0022)</script>'
      const result = await renderer.sanitizeAnkiTemplate(unicodeXss)

      expect(result.isSecure).toBe(false)
      expect(result.sanitizedHtml).not.toContain('alert')
    })

    test('should detect obfuscated JavaScript', async () => {
      const obfuscatedJs = '<div onload="eval(atob(\'YWxlcnQoXCJYU1NcIik=\'))">Content</div>'
      const result = await renderer.sanitizeAnkiTemplate(obfuscatedJs)

      expect(result.isSecure).toBe(false)
      expect(result.sanitizedHtml).not.toContain('onload')
      expect(result.sanitizedHtml).not.toContain('eval')
    })
  })

  describe('Performance and Edge Cases', () => {
    test('should handle very large HTML content', async () => {
      const largeHtml = '<div>' + 'x'.repeat(100000) + '</div>'
      const result = await renderer.sanitizeAnkiTemplate(largeHtml)

      expect(result.sanitizedHtml).toContain('x'.repeat(100000))
      expect(result.isSecure).toBe(true)
    })

    test('should handle deeply nested HTML', async () => {
      let nestedHtml = 'Content'
      for (let i = 0; i < 100; i++) {
        nestedHtml = `<div>${nestedHtml}</div>`
      }

      const result = await renderer.sanitizeAnkiTemplate(nestedHtml)
      expect(result.sanitizedHtml).toContain('Content')
      expect(result.isSecure).toBe(true)
    })

    test('should handle special characters and entities', async () => {
      const html = '<div>&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;</div>'
      const result = await renderer.sanitizeAnkiTemplate(html)

      expect(result.sanitizedHtml).toContain('&lt;script&gt;')
      expect(result.isSecure).toBe(true)
    })

    test('should handle malicious SVG content', async () => {
      const svgHtml = `
        <svg xmlns="http://www.w3.org/2000/svg">
          <script>alert('XSS')</script>
          <foreignObject>
            <iframe src="javascript:alert('XSS')"></iframe>
          </foreignObject>
        </svg>
      `
      const result = await renderer.sanitizeAnkiTemplate(svgHtml)

      expect(result.isSecure).toBe(false)
      expect(result.sanitizedHtml).not.toContain('alert')
      expect(result.sanitizedHtml).not.toContain('javascript:')
    })

    test('should handle multiple concurrent sanitization requests', async () => {
      const htmlInputs = Array.from({ length: 100 }, (_, i) => `<div>Content ${i}</div>`)
      
      const promises = htmlInputs.map(html => 
        Promise.resolve(renderer.sanitizeAnkiTemplate(html))
      )

      const results = await Promise.all(promises)
      
      results.forEach((result, index) => {
        expect(result.sanitizedHtml).toContain(`Content ${index}`)
        expect(result.isSecure).toBe(true)
      })
    })

    test('should handle CSS injection attempts', async () => {
      const cssInjection = `
        <style>
          @import url("data:text/css,* { background: url('javascript:alert(1)'); }");
          body { background: expression(alert('XSS')); }
        </style>
      `
      const result = await renderer.sanitizeAnkiTemplate(cssInjection)

      expect(result.isSecure).toBe(false)
      expect(result.sanitizedHtml).not.toContain('javascript:')
      expect(result.sanitizedHtml).not.toContain('expression(')
    })
  })

  describe('Anki-Specific Features', () => {
    test('should preserve complex Anki template syntax', async () => {
      const complexTemplate = `
        {{#Front}}
          <div class="front">{{Front}}</div>
        {{/Front}}
        {{#Back}}
          <div class="back">{{Back}}</div>
        {{/Back}}
        {{^ExtraField}}
          <div class="no-extra">No extra content</div>
        {{/ExtraField}}
        {{#ExtraField}}
          <div class="extra">{{ExtraField}}</div>
        {{/ExtraField}}
      `
      const result = await renderer.sanitizeAnkiTemplate(complexTemplate)

      expect(result.sanitizedHtml).toContain('{{#Front}}')
      expect(result.sanitizedHtml).toContain('{{/Front}}')
      expect(result.sanitizedHtml).toContain('{{^ExtraField}}')
      expect(result.sanitizedHtml).toContain('{{/ExtraField}}')
      expect(result.isSecure).toBe(true)
    })

    test('should preserve Anki media references', async () => {
      const html = '<img src="_filename.jpg"><audio src="_audio.mp3">[sound:_audio.mp3]</audio>'
      const result = await renderer.sanitizeAnkiTemplate(html)

      expect(result.sanitizedHtml).toContain('_filename.jpg')
      expect(result.sanitizedHtml).toContain('_audio.mp3')
      expect(result.sanitizedHtml).toContain('[sound:_audio.mp3]')
      expect(result.isSecure).toBe(true)
    })

    test('should handle type: fields correctly', async () => {
      const html = '<div>{{type:Text}}</div>'
      const result = await renderer.sanitizeAnkiTemplate(html)

      expect(result.sanitizedHtml).toContain('{{type:Text}}')
      expect(result.isSecure).toBe(true)
    })

    test('should preserve hint fields', async () => {
      const html = '<div>{{hint:HintField}}</div>'
      const result = await renderer.sanitizeAnkiTemplate(html)

      expect(result.sanitizedHtml).toContain('{{hint:HintField}}')
      expect(result.isSecure).toBe(true)
    })
  })

  describe('Error Handling', () => {
    test('should handle invalid HTML gracefully', async () => {
      const invalidHtml = '<div><><><><<>><<>invalid</div>'
      const result = await renderer.sanitizeAnkiTemplate(invalidHtml)

      expect(result.sanitizedHtml).toContain('invalid')
      expect(result.isSecure).toBe(true)
    })

    test('should handle renderer cleanup properly', async () => {
      renderer.cleanup()
      
      // Should still work after cleanup
      const result = await renderer.sanitizeAnkiTemplate('<div>Test</div>')
      expect(result.sanitizedHtml).toContain('Test')
      expect(result.isSecure).toBe(true)
    })

    test('should provide detailed security warnings', async () => {
      const dangerousHtml = '<script>alert("XSS")</script><div onclick="evil()">Click</div>'
      const result = await renderer.sanitizeAnkiTemplate(dangerousHtml)

      expect(result.securityWarnings.length).toBeGreaterThanOrEqual(2)
      expect(result.securityWarnings.some(w => w.includes('script'))).toBe(true)
      expect(result.securityWarnings.some(w => w.includes('onclick') || w.includes('event handler'))).toBe(true)
    })

    test('should handle memory pressure gracefully', async () => {
      // Simulate memory pressure with many large sanitization operations
      const promises = Array.from({ length: 50 }, () => {
        const largeHtml = '<div>' + 'x'.repeat(10000) + '</div>'
        return renderer.sanitizeAnkiTemplate(largeHtml)
      })

      const results = await Promise.all(promises)
      results.forEach(result => {
        expect(result.isSecure).toBe(true)
        expect(result.sanitizedHtml).toContain('x'.repeat(10000))
      })
    })
  })

  describe('Integration with DOMPurify', () => {
    test('should use strict sanitization by default', async () => {
      const html = '<embed src="evil.swf"><object data="evil.swf"></object>'
      const result = await renderer.sanitizeAnkiTemplate(html)

      expect(result.sanitizedHtml).not.toContain('<embed')
      expect(result.sanitizedHtml).not.toContain('<object')
      expect(result.isSecure).toBe(false)
    })

    test('should preserve allowed tags and attributes', async () => {
      const html = `
        <div class="card-content" style="color: blue;">
          <h1 id="title">Title</h1>
          <p><strong>Bold</strong> and <em>italic</em> text</p>
          <ul><li>List item</li></ul>
          <table><tr><td>Cell</td></tr></table>
          <img src="image.jpg" alt="Alt text">
          <br><hr>
        </div>
      `
      const result = await renderer.sanitizeAnkiTemplate(html)

      expect(result.sanitizedHtml).toContain('<div class="card-content"')
      expect(result.sanitizedHtml).toContain('<h1>')
      expect(result.sanitizedHtml).toContain('<strong>')
      expect(result.sanitizedHtml).toContain('<em>')
      expect(result.sanitizedHtml).toContain('<ul><li>')
      expect(result.sanitizedHtml).toContain('<table>')
      expect(result.sanitizedHtml).toContain('<img src="image.jpg"')
      expect(result.sanitizedHtml).toContain('<br>')
      expect(result.sanitizedHtml).toContain('Title')
      expect(result.isSecure).toBe(true)
    })
  })
})