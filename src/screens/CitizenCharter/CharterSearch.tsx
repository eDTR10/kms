import { useState } from "react"
import { Search, ArrowRight, ArrowLeft, FileText, SearchIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { citizenServices, sanitizeHtml, type CitizenService, type RequirementItem } from "./charterData"

const renderHtml = (text: string | null | undefined) => {
  if (!text) return null
  return <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(text) }} />
}

const RequirementsTable = ({ rows }: { rows: RequirementItem[] }) => (
  <div className="w-full text-sm rounded-lg overflow-hidden border border-[#0038A8]/20 dark:border-blue-800/40">
    <div className="grid grid-cols-[3fr_1fr]">
      <div className="bg-[#0038A8] text-white font-semibold p-2">CHECKLIST OF REQUIREMENTS</div>
      <div className="bg-[#0038A8] text-white font-semibold p-2 border-l border-[#002D85]">WHERE TO SECURE</div>
    </div>
    {rows.map((r, i) => (
      <div key={i} className={`grid grid-cols-[3fr_1fr] ${i % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-[#0038A8]/5 dark:bg-gray-900/40"}`}>
        <div className="p-2 text-slate-700 dark:text-gray-300 border-t border-r border-[#0038A8]/10 dark:border-blue-800/30 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(r.checklist_of_requirements) }} />
        <div className="p-2 text-slate-600 dark:text-gray-400 border-t border-[#0038A8]/10 dark:border-blue-800/30 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(r.where_to_secure) }} />
      </div>
    ))}
  </div>
)

const Requirements = ({ reqs }: { reqs: CitizenService["checklist_of_requirements"] }) => {
  if (Array.isArray(reqs)) return <div className="overflow-x-auto"><RequirementsTable rows={reqs} /></div>
  return (
    <div className="space-y-4">
      {Object.entries(reqs).map(([k, items]) => (
        <div key={k}>
          <p className="text-sm font-semibold text-[#0038A8] dark:text-blue-400 capitalize mb-1">{k.replace(/_/g, " ")}</p>
          <div className="overflow-x-auto"><RequirementsTable rows={items as RequirementItem[]} /></div>
        </div>
      ))}
    </div>
  )
}

export default function CharterSearch() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedService, setSelectedService] = useState<CitizenService | null>(null)

  const filteredServices = citizenServices.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="rounded-2xl border border-[#0038A8]/15 dark:border-blue-800/40 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
      {/* Header + search */}
      <div className="bg-gradient-to-br from-[#0038A8] to-[#001B4D] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              {selectedService ? renderHtml(selectedService.title) : "Find a Service"}
            </h3>
            {!selectedService && <p className="text-blue-100 text-sm">Search external services offered by DICT Region 10</p>}
          </div>
        </div>
        {!selectedService && (
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 z-30 -translate-y-1/2 w-4 h-4 text-[#0038A8]" />
            <Input
              type="text"
              placeholder="Search services by name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-11 pr-4 text-sm bg-white/90 backdrop-blur-sm border-0 focus:ring-2 focus:ring-white/50 rounded-xl shadow-lg placeholder:text-blue-300"
            />
          </div>
        )}
      </div>

      {/* List / Detail */}
      {!selectedService ? (
        <div className="max-h-[520px] overflow-y-auto p-5 space-y-3">
          {filteredServices.length > 0 ? (
            filteredServices.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedService(item)}
                className="w-full group bg-gradient-to-r from-white to-blue-50/50 dark:from-gray-800 dark:to-gray-800 p-4 rounded-xl border border-[#0038A8]/10 dark:border-blue-800/30 hover:border-[#0038A8] dark:hover:border-blue-500 hover:shadow-md transition-all duration-300 flex items-center justify-between gap-3 text-left"
              >
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-800 dark:text-gray-100 group-hover:text-[#0038A8] dark:group-hover:text-blue-400 transition-colors truncate">{renderHtml(item.title)}</h4>
                  <p className="text-sm text-slate-500 dark:text-gray-400 mt-0.5 line-clamp-2">{renderHtml(item.description)}</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-[#0038A8] group-hover:bg-[#002D85] flex items-center justify-center flex-shrink-0 transition-colors">
                  <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-12">
              <div className="w-16 h-16 bg-[#0038A8]/10 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-3">
                <Search className="w-8 h-8 text-[#0038A8]/60 dark:text-blue-400" />
              </div>
              <h4 className="font-bold text-slate-800 dark:text-gray-100 mb-1">No services found</h4>
              <p className="text-sm text-slate-500 dark:text-gray-400">Try adjusting your search terms or browse all services</p>
            </div>
          )}
        </div>
      ) : (
        <div className="max-h-[640px] overflow-y-auto p-5 space-y-5">
          <Button onClick={() => setSelectedService(null)} variant="ghost" className="w-fit text-[#0038A8] dark:text-blue-400 hover:text-[#001233] hover:bg-[#0038A8]/10 dark:hover:bg-blue-900/30 rounded-lg group">
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />Back to Services
          </Button>

          <div className="bg-[#0038A8]/5 dark:bg-blue-950/30 p-5 rounded-xl border-l-4 border-[#0038A8] dark:border-blue-500 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-[#0038A8]/10 dark:border-blue-800/30">
                <p className="text-xs font-semibold text-[#0038A8] dark:text-blue-400 uppercase tracking-wide mb-1">Office / Division</p>
                <p className="text-sm text-slate-700 dark:text-gray-300">{renderHtml(selectedService.office_or_division)}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-[#0038A8]/10 dark:border-blue-800/30">
                <p className="text-xs font-semibold text-[#0038A8] dark:text-blue-400 uppercase tracking-wide mb-1">Classification</p>
                <p className="text-sm text-slate-700 dark:text-gray-300">{renderHtml(selectedService.classification)}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-[#0038A8]/10 dark:border-blue-800/30">
                <p className="text-xs font-semibold text-[#0038A8] dark:text-blue-400 uppercase tracking-wide mb-1">Type of Transaction</p>
                <div className="flex flex-col gap-1">
                  {selectedService.type_of_transaction.map((t, i) => (<p key={i} className="text-sm text-slate-700 dark:text-gray-300">{renderHtml(t)}</p>))}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-[#0038A8]/10 dark:border-blue-800/30">
                <p className="text-xs font-semibold text-[#0038A8] dark:text-blue-400 uppercase tracking-wide mb-1">Who May Avail</p>
                <p className="text-sm text-slate-700 dark:text-gray-300">{renderHtml(selectedService.who_may_avail)}</p>
              </div>
            </div>

            <div>
              <h4 className="text-base font-bold text-slate-800 dark:text-gray-100 mb-2 flex items-center gap-2">
                <div className="w-6 h-6 bg-[#0038A8] rounded-md flex items-center justify-center"><FileText className="w-3.5 h-3.5 text-white" /></div>
                Description
              </h4>
              <p className="text-slate-700 dark:text-gray-300 text-sm leading-relaxed">{renderHtml(selectedService.description)}</p>
            </div>

            <div>
              <h4 className="font-semibold text-base text-[#0038A8] dark:text-blue-400 mb-2">Checklist of Requirements:</h4>
              <Requirements reqs={selectedService.checklist_of_requirements} />
            </div>

            <div>
              <h4 className="font-semibold text-base text-[#0038A8] dark:text-blue-400 mb-2">Process Flow:</h4>
              <div className="w-full text-sm rounded-lg overflow-hidden border border-[#0038A8]/20 dark:border-blue-800/40">
                <div className="grid grid-cols-[2fr_2fr_1fr_1fr_2fr]">
                  <div className="bg-[#0038A8] text-white font-semibold p-2 text-xs">CLIENT STEPS</div>
                  <div className="bg-[#0038A8] text-white font-semibold p-2 border-l border-[#002D85] text-xs">AGENCY ACTION</div>
                  <div className="bg-[#0038A8] text-white font-semibold p-2 border-l border-[#002D85] text-xs">FEES</div>
                  <div className="bg-[#0038A8] text-white font-semibold p-2 border-l border-[#002D85] text-xs">PROCESSING TIME</div>
                  <div className="bg-[#0038A8] text-white font-semibold p-2 border-l border-[#002D85] text-xs">PERSON RESPONSIBLE</div>
                </div>
                {selectedService.process_flow.map((step, idx) => (
                  <div key={idx} className={`grid grid-cols-[2fr_2fr_1fr_1fr_2fr] ${idx % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-[#0038A8]/5 dark:bg-gray-900/40"}`}>
                    <div className="p-2 text-slate-700 dark:text-gray-300 border-t border-r border-[#0038A8]/10 dark:border-blue-800/30 leading-relaxed text-xs" dangerouslySetInnerHTML={{ __html: sanitizeHtml(step.client_steps ?? "") }} />
                    <div className="p-2 text-slate-700 dark:text-gray-300 border-t border-r border-[#0038A8]/10 dark:border-blue-800/30 leading-relaxed text-xs" dangerouslySetInnerHTML={{ __html: sanitizeHtml(step.agency_action) }} />
                    <div className="p-2 text-slate-700 dark:text-gray-300 border-t border-r border-[#0038A8]/10 dark:border-blue-800/30 leading-relaxed text-xs" dangerouslySetInnerHTML={{ __html: sanitizeHtml(step.fees_to_be_paid) }} />
                    <div className="p-2 text-slate-700 dark:text-gray-300 border-t border-r border-[#0038A8]/10 dark:border-blue-800/30 leading-relaxed text-xs" dangerouslySetInnerHTML={{ __html: sanitizeHtml(step.processing_time) }} />
                    <div className="p-2 text-slate-700 dark:text-gray-300 border-t border-[#0038A8]/10 dark:border-blue-800/30 leading-relaxed text-xs" dangerouslySetInnerHTML={{ __html: sanitizeHtml(step.person_responsible) }} />
                  </div>
                ))}
              </div>
            </div>

            {selectedService.total && (
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-3 border border-[#0038A8]/10 dark:border-blue-800/30">
                  <p className="text-xs font-semibold text-[#0038A8] dark:text-blue-400 uppercase tracking-wide mb-1">Total Fees to be Paid</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-gray-100">{renderHtml(selectedService.total.fees_to_be_paid)}</p>
                </div>
                <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-3 border border-[#0038A8]/10 dark:border-blue-800/30">
                  <p className="text-xs font-semibold text-[#0038A8] dark:text-blue-400 uppercase tracking-wide mb-1">Total Processing Time</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-gray-100">{renderHtml(selectedService.total.processing_time)}</p>
                </div>
              </div>
            )}

            {selectedService.mode_of_payment && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-[#0038A8]/10 dark:border-blue-800/30">
                <p className="text-xs font-semibold text-[#0038A8] dark:text-blue-400 uppercase tracking-wide mb-1">Mode of Payment</p>
                <p className="text-sm text-slate-700 dark:text-gray-300">{renderHtml(selectedService.mode_of_payment)}</p>
              </div>
            )}

            {selectedService.regional_email_contacts && (
              <div>
                <h4 className="font-semibold text-base text-[#0038A8] dark:text-blue-400 mb-2">Regional Email Contacts:</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead><tr className="bg-[#0038A8] text-white"><th className="p-2 text-left font-semibold w-1/3">Region</th><th className="p-2 text-left font-semibold w-2/3">Email Address</th></tr></thead>
                    <tbody>
                      {Object.entries(selectedService.regional_email_contacts).map(([region, email], i) => (
                        <tr key={region} className={i % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-[#0038A8]/5 dark:bg-gray-900/40"}>
                          <td className="p-2 align-top text-slate-700 dark:text-gray-300 font-medium border border-[#0038A8]/10 dark:border-blue-800/30">{region}</td>
                          <td className="p-2 align-top border border-[#0038A8]/10 dark:border-blue-800/30">
                            {Array.isArray(email)
                              ? <div className="flex flex-col gap-1">{email.map((e, idx) => (<a key={idx} href={`mailto:${e}`} className="text-[#0038A8] dark:text-blue-400 hover:underline">{e}</a>))}</div>
                              : <a href={`mailto:${email}`} className="text-[#0038A8] dark:text-blue-400 hover:underline">{email}</a>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
