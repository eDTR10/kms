import charterData from "./CC_TARP_Regional_External_2025.json"

// ── Types ──────────────────────────────────────────────────────────────────────
export interface ProcessFlowItem {
  client_steps: string | null
  agency_action: string
  fees_to_be_paid: string
  processing_time: string
  person_responsible: string
}
export interface RequirementItem {
  checklist_of_requirements: string
  where_to_secure: string
}
export interface JsonService {
  service_number: number
  service_name: string
  description: string
  office_or_division: string
  classification: string
  type_of_transaction: string[]
  who_may_avail: string
  checklist_of_requirements: RequirementItem[] | Record<string, RequirementItem[]>
  process_flow: ProcessFlowItem[]
  total?: { fees_to_be_paid: string; processing_time: string }
  mode_of_payment?: string
  regional_email_contacts?: Record<string, string | string[]>
}
export interface CitizenService {
  id: string
  title: string
  description: string
  office_or_division: string
  classification: string
  type_of_transaction: string[]
  who_may_avail: string
  checklist_of_requirements: RequirementItem[] | Record<string, RequirementItem[]>
  process_flow: ProcessFlowItem[]
  total?: { fees_to_be_paid: string; processing_time: string }
  mode_of_payment?: string
  regional_email_contacts?: Record<string, string | string[]>
}
export interface CharterDocument {
  services: JsonService[]
  feedback_and_complaints_mechanism: {
    how_to_send_feedback: string[]
    how_feedbacks_are_processed: string[]
    how_to_file_a_complaint: {
      channel: string
      required_details: string[]
      other_channels: Array<{ name: string; email?: string; hotline?: string; contact?: string }>
    }
    how_complaints_are_processed: string[]
    contact_information_of_ccb_pcc_arta: Record<string, string>
  }
}

// CC_TARP_Regional_External_2025.json is currently empty (data not yet
// supplied) — this default keeps consumers rendering an empty/graceful state
// instead of crashing, and will be replaced automatically once the real
// document data is filled in.
const EMPTY_CHARTER_DOCUMENT: CharterDocument = {
  services: [],
  feedback_and_complaints_mechanism: {
    how_to_send_feedback: [],
    how_feedbacks_are_processed: [],
    how_to_file_a_complaint: { channel: "", required_details: [], other_channels: [] },
    how_complaints_are_processed: [],
    contact_information_of_ccb_pcc_arta: {},
  },
}

export const charterDoc: CharterDocument =
  (charterData as { document?: CharterDocument }).document ?? EMPTY_CHARTER_DOCUMENT

export const mapJsonServices = (services: JsonService[]): CitizenService[] =>
  services.map((s) => ({
    id: String(s.service_number), title: s.service_name, description: s.description,
    office_or_division: s.office_or_division, classification: s.classification,
    type_of_transaction: s.type_of_transaction, who_may_avail: s.who_may_avail,
    checklist_of_requirements: s.checklist_of_requirements, process_flow: s.process_flow,
    total: s.total, mode_of_payment: s.mode_of_payment, regional_email_contacts: s.regional_email_contacts,
  }))

export const citizenServices: CitizenService[] = mapJsonServices(
  charterDoc.services as unknown as JsonService[]
)

export const sanitizeHtml = (text: string | null | undefined): string => {
  if (!text) return ""
  return text
    .replace(/<br\s*\/?>/gi, "###BR###")
    .replace(/<(?!\/?(b|strong|span)(\s[^>]*)?>)[^>]+>/gi, "")
    .replace(/<span\s+style="(?!color)[^"]*"[^>]*>/gi, "<span>")
    .replace(/###BR###/g, "<br/>")
}
