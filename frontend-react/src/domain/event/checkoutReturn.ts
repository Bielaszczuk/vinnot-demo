/** Only navigation hints: payment status always comes from the receipt API. */
export function checkoutReturnDetails(params: URLSearchParams) {
  const receipt = params.get('receipt')
  const ticketId = params.get('ticketId')
  if (!receipt || !/^[A-Za-z0-9_-]{1,512}$/.test(receipt)) return null
  return {
    receipt,
    ticketId:
      ticketId && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(ticketId)
        ? ticketId.toLowerCase()
        : null,
  }
}
