import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'

Object.defineProperty(window, 'scrollTo', { configurable: true, value: () => undefined })
