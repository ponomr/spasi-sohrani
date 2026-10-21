import { test, expect } from 'claude-code/testing'
import type { On } from 'claude-code'
import type { Engine } from 'claude-code/testing'

const BAND = {
  plugin: 'spasi-sohrani',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

const TURN = { answer: '', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' } as const
const PROMPT = { text: 'next', wait: false, origin: { kind: 'composer' } } as const
const MESSAGE = { role: 'user' as const, text: 'summary', toolUses: [] }

const engine = (on: On) => {
  on('fs.read', async () => ({ value: { base64: 'AAAA' } }))
  on('ui.render', ($, e) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })
  on('tool.call', () => ({ result: {} }))
}

for (const surface of ['terminal', 'desktop'] as const) {
  const band = async ($: Engine) => {
    const ui = await $.ui.mount({ ...BAND, surface })
    const icons = await ui.findAll({ type: surface === 'terminal' ? 'Image' : 'Svg' })
    const captions = await ui.findAll({ type: 'Text' })
    await ui.unmount()

    return { icons: icons.length, captions: captions.map(text => text.text) }
  }

  test(`${surface}: a dangerous command shows the icons until the next prompt`, async ($, on) => {
    engine(on)
    on('prompt.submit', (_, e) => ({ text: e.text }))

    await $.tool.call({ tool: 'Bash', command: 'ls -la' })
    expect(await band($)).toEqual({ icons: 0, captions: [] })

    await $.tool.call({ tool: 'Bash', command: 'git push --force origin main' })
    expect(await band($)).toEqual({ icons: 7, captions: ['Lord, have mercy: git push --force origin main'] })

    await $.prompt.submit(PROMPT)
    expect(await band($)).toEqual({ icons: 0, captions: [] })

    await $.tool.call({ tool: 'mcp__bear__trash_note', id: 'x' } as never)
    expect((await band($)).captions).toEqual(['Lord, have mercy: mcp__bear__trash_note'])
  })

  test(`${surface}: dangerous commands are ignored when switched off`, { options: { onDanger: false } }, async ($, on) => {
    engine(on)

    await $.tool.call({ tool: 'Bash', command: 'rm -rf build' })
    expect(await band($)).toEqual({ icons: 0, captions: [] })
  })

  test(`${surface}: a full context asks for /compact, compaction clears it`, async ($, on) => {
    let percent = 50
    engine(on)
    on('session.usage', () => ({ value: { startedAt: 0, rateLimits: [], context: { window: 200000, percent } } }))
    on('turn.complete', () => ({ text: '' }))
    let duringCompaction: Awaited<ReturnType<typeof band>> | null = null
    on('session.compact', async () => {
      duringCompaction = await band($)

      return { messages: [MESSAGE] }
    })

    await $.turn.complete(TURN)
    expect(await band($)).toEqual({ icons: 0, captions: [] })

    percent = 86.4
    await $.turn.complete(TURN)
    expect(await band($)).toEqual({ icons: 7, captions: ['My cup runneth over: context 86% full, time to /compact'] })

    await $.session.compact({ trigger: 'manual', messages: [MESSAGE] })
    expect(duringCompaction).toEqual({ icons: 7, captions: ['Blessed are the summarized…'] })
    expect(await band($)).toEqual({ icons: 0, captions: [] })
  })
}

test('the auto set follows the setting', { options: { autoSet: 'vibe' } }, async ($, on) => {
  on('tool.call', () => ({ result: {} }))

  await $.tool.call({ tool: 'Bash', command: 'git reset --hard HEAD~1' })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.findAll({ type: 'Image' }))[0]?.props.alt).toBe('Линус Торвальдс')
  await ui.unmount()
})
