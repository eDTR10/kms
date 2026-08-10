import DOMPurify from "dompurify"
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

// Only "color" is kept on a style attribute - everything else (position,
// expression(), url(), etc.) is stripped so an allowed <span style="..."> can't
// be turned into a layout/overlay trick.
DOMPurify.addHook("uponSanitizeAttribute", (_node, data) => {
  if (data.attrName !== "style") return
  const colorMatch = data.attrValue.match(/(?:^|;)\s*color\s*:\s*[^;]+/i)
  data.attrValue = colorMatch ? colorMatch[0].replace(/^;\s*/, "") : ""
})

export const sanitizeHtml = (text: string | null | undefined): string => {
  if (!text) return ""
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: ["b", "strong", "span", "br"],
    ALLOWED_ATTR: ["style"],
  })
}
