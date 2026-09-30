import { describe, expect, it } from 'vitest'
import { urlAbsoluta } from './env'

describe('urlAbsoluta', () => {
  it('resuelve rutas relativas contra el origen de la página (modo demo)', () => {
    expect(urlAbsoluta('/', 'https://mi-codespace-5173.app.github.dev')).toBe('https://mi-codespace-5173.app.github.dev')
    expect(urlAbsoluta('/api', 'http://localhost:5173')).toBe('http://localhost:5173/api')
  })

  it('deja igual las URLs absolutas y los valores vacíos', () => {
    expect(urlAbsoluta('https://ubijemneujcpxdzwoufk.supabase.co')).toBe('https://ubijemneujcpxdzwoufk.supabase.co')
    expect(urlAbsoluta('')).toBe('')
  })
})
