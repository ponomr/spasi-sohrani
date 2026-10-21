export type SetName = 'sohrani' | 'vibe'

export type Alert = { text: string; tone: 'error' | 'warning' | 'suggestion' }

declare module 'claude-code' {
  interface PluginState {
    'spasi-sohrani': { shownSet: SetName | null; danger: Alert | null; context: Alert | null }
  }
}
