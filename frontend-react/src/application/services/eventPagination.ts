/** Top-level API pages use PageResponseWrapper; nested discovery pages use PageResult. */
interface EventPageMetadata {
  pageNumber?: number;
  pageSize?: number;
  totalItems?: number;
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages: number;
}

export function mapEventPagination(response: EventPageMetadata, requestedPage = 0, requestedSize = 20) {
  const pageNumber = response.pageNumber ?? response.page ?? requestedPage;
  const pageSize = response.pageSize ?? response.size ?? requestedSize;
  return {
    pageNumber,
    pageSize,
    totalItems: response.totalItems ?? response.totalElements ?? 0,
    totalPages: response.totalPages,
    hasNext: pageNumber + 1 < response.totalPages,
    hasPrevious: pageNumber > 0,
  };
}
