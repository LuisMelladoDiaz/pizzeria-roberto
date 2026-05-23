// Client-side ticket association — no personal data, RGPD-exempt
const LS_KEY = 'servi-call-tickets-v2'
export const SORT_KEY = 'servi-call-sort'

export interface StoredTicket {
  businessId: string
  businessSlug: string
  businessName: string
  businessEmoji: string
  ticketCode: string
}

export function getStoredTickets(): StoredTicket[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') as StoredTicket[]
  } catch {
    return []
  }
}

export function addStoredTicket(ticket: StoredTicket): void {
  const existing = getStoredTickets().filter(
    (t) => !(t.businessId === ticket.businessId && t.ticketCode === ticket.ticketCode),
  )
  localStorage.setItem(LS_KEY, JSON.stringify([...existing, ticket]))
}

export function removeStoredTicket(businessId: string, ticketCode: string): void {
  const remaining = getStoredTickets().filter(
    (t) => !(t.businessId === businessId && t.ticketCode === ticketCode),
  )
  localStorage.setItem(LS_KEY, JSON.stringify(remaining))
}
