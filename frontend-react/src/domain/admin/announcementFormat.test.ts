import { describe, expect, it } from 'vitest'
import { applyAnnouncementFormat } from './announcementFormat'

describe('announcement toolbar', () => {
  it('makes the selection bold and keeps it selected', () => {
    const edit = applyAnnouncementFormat('Join us on Saturday', 11, 19, 'bold', 'text')
    expect(edit.text).toBe('Join us on **Saturday**')
    expect(edit.text.slice(edit.selectionStart, edit.selectionEnd)).toBe('Saturday')
  })

  it('turns the whole line into a heading, once', () => {
    const once = applyAnnouncementFormat('Intro\nHarvest weekend\nMore', 8, 8, 'heading', 'Heading')
    expect(once.text).toBe('Intro\n## Harvest weekend\nMore')
    expect(applyAnnouncementFormat(once.text, 9, 9, 'heading', 'Heading').text).toBe(once.text)
  })

  it('links the selection and selects the address to fill in', () => {
    const edit = applyAnnouncementFormat('See the agenda', 8, 14, 'link', 'link text')
    expect(edit.text).toBe('See the [agenda](https://)')
    expect(edit.text.slice(edit.selectionStart, edit.selectionEnd)).toBe('https://')
  })

  it('puts a button on its own line, with a label when nothing is selected', () => {
    const edit = applyAnnouncementFormat('Tastings all month.', 19, 19, 'button', 'Learn more')
    expect(edit.text).toBe('Tastings all month.\n[[Learn more]](https://)')
    expect(edit.text.slice(edit.selectionStart, edit.selectionEnd)).toBe('https://')
    expect(applyAnnouncementFormat('', 0, 0, 'button', 'Go').text).toBe('[[Go]](https://)')
  })
})
