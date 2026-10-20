import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'
import type { SetName } from '../types'

// Each command toggles its own set; showing one set replaces the other.
const SETS = {
  sohrani: {
    command: 'spasi-sohrani',
    description: 'Показать или скрыть семь иконок над строкой ввода',
    shownText: 'Иконки показаны над строкой ввода.',
    icons: [
      { name: '01-isidore-of-seville', alt: 'Святитель Исидор Севильский' },
      { name: '02-john-the-theologian', alt: 'Апостол Иоанн Богослов' },
      { name: '03-theophan-the-recluse', alt: 'Святитель Феофан Затворник' },
      { name: '04-archangel-gabriel', alt: 'Архангел Гавриил' },
      { name: '05-cyril-and-methodius', alt: 'Святые Кирилл и Мефодий' },
      { name: '06-john-of-damascus', alt: 'Преподобный Иоанн Дамаскин' },
      { name: '07-francis-de-sales', alt: 'Святой Франциск Сальский' },
    ],
  },
  vibe: {
    command: 'spasi-vibe',
    description: 'Показать или скрыть семь vibe-иконок над строкой ввода',
    shownText: 'Vibe-иконки показаны над строкой ввода.',
    icons: [
      { name: '01-linus-torvalds', alt: 'Линус Торвальдс' },
      { name: '02-steve-jobs', alt: 'Стив Джобс' },
      { name: '03-bill-gates', alt: 'Билл Гейтс' },
      { name: '04-elon-musk', alt: 'Илон Маск' },
      { name: '05-sam-altman', alt: 'Сэм Альтман' },
      { name: '06-dario-amodei', alt: 'Дарио Амодеи' },
      { name: '07-andrej-karpathy', alt: 'Андрей Карпаты' },
    ],
  },
} as const satisfies Record<SetName, unknown>

// The JPEGs in assets/<set>/jpg/ are square, SIDE pixels each (made from assets/<set>/png/).
// The desktop drew nothing for 320px ones (about 50K characters each); 180px ones at quality 75 (about 17K) draw.
const SIDE = 180
// The terminal prompt box is 3 rows tall; 1.5x of it, with cells about twice as tall as wide.
const TERMINAL_ROWS = 5
const TERMINAL_COLUMNS = 10

const shownSet = atom({ plugin: 'spasi-sohrani', key: 'shownSet' } as const, null as SetName | null)

const svgCache = new Map<string, string>()

export const register: Register = (on, options) => {
  // The engine fills in the manifest's default (90px, twice the desktop prompt box).
  const size = options.iconSize as number

  on('session.start', async ($, e, next) => {
    for (const set of Object.values(SETS)) {
      await $.command.register({ name: set.command, description: set.description })
    }

    return next(e)
  })

  for (const [setName, set] of Object.entries(SETS) as [SetName, (typeof SETS)[SetName]][]) {
    on('command.run', { command: set.command }, async $ => {
      const shown = await update($, shownSet, value => (value === setName ? null : setName))

      return { text: shown ? set.shownText : 'Иконки скрыты.' }
    })
  }

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const setName = await read($, shownSet)
    if (!setName) {
      return next(e)
    }
    const icons = SETS[setName].icons

    // The session survey also lives in this band: draw it under the icons.
    const survey = e.props.hasSurvey ? await next(e) : null

    const { Box } = $.ui.resolve(e)
    let leaves
    if (e.surface === 'terminal') {
      const { Image } = $.ui.resolve(e)
      const rows = Math.min(TERMINAL_ROWS, Math.max(1, e.props.maxRows))
      leaves = icons.map(icon => (
        <Image
          key={icon.name}
          source={{ file: `${$.plugin.root}/assets/${setName}/png/${icon.name}.png`, format: 'png' }}
          columns={TERMINAL_COLUMNS}
          rows={rows}
          alt={icon.alt}
        />
      ))
    } else {
      const { Svg } = $.ui.resolve(e)
      const sources = await Promise.all(
        icons.map(async icon => {
          const path = `${$.plugin.root}/assets/${setName}/jpg/${icon.name}.jpg`
          const cached = svgCache.get(path)
          if (cached) return cached
          const { base64 } = await $.fs.read(path, { as: 'bytes' })
          const svg =
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIDE} ${SIDE}">` +
            `<image href="data:image/jpeg;base64,${base64}" width="${SIDE}" height="${SIDE}"/></svg>`
          svgCache.set(path, svg)

          return svg
        }),
      )
      leaves = icons.map((icon, i) => (
        <Svg key={icon.name} source={sources[i] ?? ''} alt={icon.alt} width={size} height={size} />
      ))
    }

    return (
      <Box flexDirection="column" width="100%">
        <Box flexDirection="row" flexWrap="wrap" justifyContent="center" alignItems="center" gap={1} width="100%">
          {leaves}
        </Box>
        {survey}
      </Box>
    )
  })
}
