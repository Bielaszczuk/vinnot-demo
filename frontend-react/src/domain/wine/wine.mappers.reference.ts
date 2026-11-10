import type { WineType, WineTypeOption } from './wine.types'

type WineTypeReferenceInput = {
  code: string
  nameEs?: string | null
  nameEn?: string | null
}

/** Reference wine types as filter options; entries without a code are not selectable. */
export function mapWineTypeOptionsFromDto(dtos: WineTypeReferenceInput[]): WineTypeOption[] {
  return dtos.flatMap((dto) => {
    const code = dto.code.trim().toUpperCase()
    if (!code) return []
    return [{
      code,
      value: code.toLowerCase() as WineType,
      names: { es: dto.nameEs?.trim() || code, en: dto.nameEn?.trim() || code },
    }]
  })
}
