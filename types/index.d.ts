export type SetName = 'sohrani' | 'vibe'

declare module 'claude-code' {
  interface PluginState {
    'spasi-sohrani': { shownSet: SetName | null }
  }
}
