/** One active entry of a reference catalog (`GET /reference/*`). */
export interface ReferenceDataDto {
  code: string
  nameEs: string | null
  nameEn: string | null
}
