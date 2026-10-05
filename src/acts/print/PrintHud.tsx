import { content } from '../../content'
import { ActCopy } from '../../hud/ActCopy'
import { PRINT_BEATS } from './beats'
import { PrinterChip } from './PrinterChip'

const c = content.print

/** Act 2 copy: heading, caption and the printer chip. */
export function PrintHud() {
  return (
    <ActCopy label={content.actNames.print} heading={c.heading} caption={c.caption} copyIn={PRINT_BEATS.copyIn} copyOut={PRINT_BEATS.copyOut}>
      <PrinterChip />
    </ActCopy>
  )
}
