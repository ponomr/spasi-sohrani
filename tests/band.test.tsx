import { test, expect } from 'claude-code/testing'

const BAND = {
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

const SETS = [
  {
    command: 'spasi-sohrani',
    alts: [
      'Святитель Исидор Севильский',
      'Апостол Иоанн Богослов',
      'Святитель Феофан Затворник',
      'Архангел Гавриил',
      'Святые Кирилл и Мефодий',
      'Преподобный Иоанн Дамаскин',
      'Святой Франциск Сальский',
    ],
  },
  {
    command: 'spasi-vibe',
    alts: ['Линус Торвальдс', 'Стив Джобс', 'Билл Гейтс', 'Илон Маск', 'Сэм Альтман', 'Дарио Амодеи', 'Андрей Карпаты'],
  },
]

test('each command toggles its seven centered icons above the prompt', async ($, on) => {
  on('fs.read', async () => ({ value: { base64: 'AAAA' } }))
  on('ui.render', async ($, e) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })

  for (const surface of ['terminal', 'desktop'] as const) {
    const leaf = surface === 'terminal' ? 'Image' : 'Svg'
    const alts = async () => {
      const ui = await $.ui.mount({ plugin: 'spasi-sohrani', surface, ...BAND })
      const icons = await ui.findAll({ type: leaf })
      const boxes = await ui.findAll({ type: 'Box' })
      if (icons.length > 0) {
        expect(boxes.some(box => box.props.justifyContent === 'center')).toBe(true)
        if (surface === 'desktop') {
          expect(icons[0]?.props.height).toBe(90)
        }
      }
      await ui.unmount()

      return icons.map(icon => icon.props.alt)
    }

    expect(await alts()).toEqual([])
    for (const set of SETS) {
      await $.command.run({ command: set.command })
      expect(await alts()).toEqual(set.alts)
    }
    // The second set replaced the first; its command again hides it.
    await $.command.run({ command: 'spasi-vibe' })
    expect(await alts()).toEqual([])
  }
})
