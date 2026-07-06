import { useState, useEffect, useRef } from "react"
import { ChevronLeft, ChevronRight, Calendar, Search, ArrowRight, ArrowLeft, FileText, Newspaper, Megaphone, Lock, Unlock, MapPin, Droplets, ArrowDownIcon, PhoneCall, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import axios from "axios"

import eGov from "../../assets/project-logo/eGovPH Logo.png"
import eLGU from "../../assets/project-logo/eLGU Logo.png"
import Lakip from "../../assets/project-logo/lakip.png"
import FreeWiFi from "../../assets/project-logo/Free Wifi.png"
import IIDB from "../../assets/project-logo/IIDB.png"
import ILCDB from "../../assets/project-logo/ILCDB.png"
import CyberSec from "../../assets/project-logo/cyber-sec.png"
import NBP from "../../assets/project-logo/NBP.png"
import PNPKI from "../../assets/project-logo/PNPKI.jpg"
import NIPPSB from "../../assets/project-logo/NIPPSB.png"
import DictLogo from "../../assets/project-logo/DICT Logo.png"

// Officer photos aren't in the repo yet — these are plain public/ paths (not
// bundled imports) so the app still builds and runs before the real files are
// dropped in. Once added, place them at:
//   public/citizen-charter/officers/<name>.jpg
const PDF_CC_TARP = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/CC_TARP_Regional_External_2025.pdf`
import { charterDoc, citizenServices, sanitizeHtml, type CitizenService, type RequirementItem } from "./charterData"
// ── Types ──────────────────────────────────────────────────────────────────────
interface WeatherData { temperature: number; humidity: number; description: string; location: string }
interface NewsItem { date: string; title: string; category: string; postUrl: string }
interface VideoItem { id: string; duration: number }
interface EventItem { date: string; title: string; time: string; description: string }
interface AnnouncementItem { date: string; title: string; priority: string; description: string }
interface OfficerData { name: string; province: string; email: string; address: string; photo: string | null; map: string,tel:string }
interface MapModal { name: string; address: string; mapUrl: string }

// ── Component ──────────────────────────────────────────────────────────────────
const CitizenCharter = () => {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedService, setSelectedService] = useState<CitizenService | null>(null)
  const [currentPanel, setCurrentPanel] = useState(0)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const [isAutoSwipe, setIsAutoSwipe] = useState(true)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [news, setNews] = useState<NewsItem[]>([])
  const [videos, setVideos] = useState<VideoItem[]>([
    { id: "_PdnRgVc19w", duration: 210 },
    { id: "6tM6SfzhcrA", duration: 94 },
    { id: "dofoQn3X-20", duration: 102 },
  ])

  const [showPdfModal, setShowPdfModal] = useState(false)
  const [events, setEvents] = useState<EventItem[]>([])
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([])
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementItem | null>(null)
  const [showFacebookPage, setShowFacebookPage] = useState(false)
  const [showNewsScrollHint, setShowNewsScrollHint] = useState(true)
  const [showEventsScrollHint, setShowEventsScrollHint] = useState(true)
  const [showAnnouncementsScrollHint, setShowAnnouncementsScrollHint] = useState(true)
  const [showServicesScrollHint, setShowServicesScrollHint] = useState(true)
  const [showKeyboard, setShowKeyboard] = useState(false)
  const [videoCountdown, setVideoCountdown] = useState(0)
  // ── Map modal state ───────────────────────────────────────────────────────
  const [mapModal, setMapModal] = useState<MapModal | null>(null)
  


  const autoSwipeTimer = useRef<NodeJS.Timeout | null>(null)
  const videoAutoNextTimer = useRef<NodeJS.Timeout | null>(null)
  const videoIframeRef = useRef<HTMLIFrameElement>(null)
  const newsScrollRef = useRef<HTMLDivElement>(null)
  const eventsScrollRef = useRef<HTMLDivElement>(null)
  const announcementsScrollRef = useRef<HTMLDivElement>(null)
  const servicesScrollRef = useRef<HTMLDivElement>(null)
  const detailScrollRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)


  const citizenItems: CitizenService[] = citizenServices

  // ── Director & Officers data ──────────────────────────────────────────────
  const directorOfficers: OfficerData[] = [
    {
      name: "SITTIE RAHMA V. ALAWI, MTM, CSSGB",
      province: "Regional Director, DICT Region X",
      email: "region10@dict.gov.ph",
      address: "DICT Bldg. Villarin Street, Carmen, Cagayan de Oro, Philippines, 9000",
      photo: null, // public/citizen-charter/officers/rd.jpg
      tel:"(088) 567 1769",
      map: "8.486695067648888, 124.63226903326867"
    },
  ]

  const provincialOfficers: OfficerData[] = [
    {
      name: "Engr. Michael Andrew E. Buot",
      province: "Bukidnon",
      email: "r10.bukidnon@dict.gov.ph",
      address: "Captain Juan Melendez St., Malaybalay City, Bukidnon",
      photo: null, // public/citizen-charter/officers/bukidnon.jpg
      tel:"(088) 537 0594",
      map: "8.1537392,125.1277816"
    },
    {
      name: "Nideliza Fe O. Nacilla",
      province: "MISAMIS ORIENTAL & CAGAYAN DE ORO CITY",
      email: "r1O.misamisoriental@dict.gov.ph",
      address: "Toribio Chavez St., Cagayan de Oro City, Misamis Oriental",
      photo: null, // public/citizen-charter/officers/misamis-oriental.jpg
      tel:"(088) 859 1280",
      map: "8.477131591214658, 124.64323171893022"
    },
    {
      name: "Engr. Kenneth T. Asuncion",
      province: "Misamis Occidental",
      email: "dict1O.misocc@dict.gov.ph",
      address: "Independence St., Pob II, Oroquieta City, Misamis Occidental",
      photo: null, // public/citizen-charter/officers/misamis-occidental.jpg
      tel:"(088) 521 3768",
      map: "8.48574016568015, 123.8085086481916"
    },
    {
      name: "Engr. James Kevin M. Sagocsoc",
      province: "Camiguin",
      email: "r10.camiguin@dict.gov.ph",
      address: "Gen. B. Aranas Street, Poblacion, Mambajao, Camiguin",
      photo: null, // public/citizen-charter/officers/camiguin.jpg
      tel:"(088) 845 7300",
      map: "9.24341212362749, 124.72370144839408"
    },
    {
      name: "Engr. Owieda B. Smith",
      province: "Lanao del Norte",
      email: "r1O.lanaodelnorte@dict.gov.ph",
      address: "Purok 3 RCIS, Poblacion, Tubod, Lanao del Norte",
      photo: null, // public/citizen-charter/officers/lanao-del-norte.jpg
      tel:"(063) 227 6876",
      map: "8.056634422, 123.7889082"
    },
    {
      name: "Acmilah M. Macabuat",
      province: "Iligan City",
      email: "dict10.iligan@dict.gov.ph",
      address: "City Hall Grounds, Brgy Palao, Iligan City",
      photo: null, // public/citizen-charter/officers/iligan.jpg
      tel:"(063) 223 7136",
      map: "8.225916191011857, 124.25174195680769"
    },
  ]

  const [activeLogo, setActiveLogo] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setActiveLogo((p) => (p + 1) % 10), 1200)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const SHEET_ID = "1cZNThXFsQjmRc3CAZoInjW29J-tULoOuATgaDi3eQMY"
        const SHEET_NAME = "events"
        const API_KEY = import.meta.env.VITE_GOOGLE_KEY
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_NAME}!A2:D?key=${API_KEY}`
        const response = await axios.get(url)
        if (response.data?.values?.length > 0) {
          setEvents(
            response.data.values.map((row: string[]) => ({
              date: row[2] || "",
              title: row[0] || "",
              time: row[3] || "",
              description: row[1] || "",
            }))
          )
        }
      } catch {
        setEvents([
          { date: "Feb 1, 2026", title: "Team Meeting", time: "10:00 AM", description: "Monthly team meeting to discuss ongoing projects, updates, and upcoming initiatives. All team members are expected to attend and provide status updates on their assigned tasks." },
          { date: "Feb 3, 2026", title: "Project Review", time: "2:00 PM", description: "Comprehensive review of the current project status, milestones achieved, and next steps. Stakeholders will evaluate progress and discuss any challenges or roadblocks." },
          { date: "Feb 5, 2026", title: "Client Presentation", time: "11:30 AM", description: "Formal presentation to clients showcasing project deliverables, progress reports, and future implementation plans. Q&A session will follow the presentation." },
          { date: "Feb 8, 2026", title: "Workshop", time: "3:00 PM", description: "Interactive training workshop focused on new technologies and best practices. Participants will gain hands-on experience and practical knowledge applicable to their daily work." },
          { date: "Feb 10, 2026", title: "Department Sync", time: "9:00 AM", description: "Inter-department synchronization meeting to align goals, share updates, and coordinate cross-functional activities. Key decision-makers from all departments will attend." },
        ])
      }
    }
    fetchEvents()
    const eventsInterval = setInterval(fetchEvents, 300000)
    return () => clearInterval(eventsInterval)
  }, [])

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const SHEET_ID = "1cZNThXFsQjmRc3CAZoInjW29J-tULoOuATgaDi3eQMY"
        const SHEET_NAME = "announcements"
        const API_KEY = import.meta.env.VITE_GOOGLE_KEY
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_NAME}!A2:D?key=${API_KEY}`
        const response = await axios.get(url)
        if (response.data?.values?.length > 0) {
          setAnnouncements(
            response.data.values.map((row: string[]) => ({
              date: row[3] || "",
              time: row[4] || "",
              title: row[0] || "",
              priority: row[2] || "",
              description: row[1] || "",
            }))
          )
        }
      } catch {
        setAnnouncements([
          { date: "Jan 30, 2026", title: "Office Closure for National Holiday", priority: "High", description: "The office will be closed in observance of the national holiday. All operations will resume on the next working day. Emergency contact information is available on the company portal." },
          { date: "Jan 29, 2026", title: "System Maintenance Scheduled", priority: "Medium", description: "Scheduled system maintenance will be performed to upgrade infrastructure and improve performance. Some services may be temporarily unavailable during the maintenance window. Please save your work regularly." },
          { date: "Jan 27, 2026", title: "New Service Window Hours", priority: "Low", description: "Service window hours have been updated to better accommodate client needs. The new schedule will be effective immediately. Please check the updated hours on the website or contact reception for details." },
        ])
      }
    }
    fetchAnnouncements()
    const announcementsInterval = setInterval(fetchAnnouncements, 300000)
    return () => clearInterval(announcementsInterval)
  }, [])

  const totalPanels = 3
  const filteredServices = citizenItems.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const options = {
          method: "GET",
          url: "https://weather-api167.p.rapidapi.com/api/weather/current",
          params: {
            lon: import.meta.env.VITE_WEATHER_LON || "124.629684",
            lat: import.meta.env.VITE_WEATHER_LAT || "8.4866927",
            zip: import.meta.env.VITE_WEATHER_ZIP || "9000",
          },
          headers: {
            "x-rapidapi-key": import.meta.env.VITE_RAPIDAPI_KEY,
            "x-rapidapi-host": import.meta.env.VITE_RAPIDAPI_HOST || "weather-api167.p.rapidapi.com",
            Accept: "application/json",
          },
        }
        const response = await axios.request(options)
        if (response.data) {
          const tempInCelsius = response.data.main?.temprature
            ? Math.round(response.data.main.temprature - 273.15)
            : 24
          setWeather({
            temperature: tempInCelsius,
            humidity: response.data.main?.humidity || 65,
            description: response.data.weather?.[0]?.description || "Partly Cloudy",
            location: response.data.name || "Unknown",
          })
        }
      } catch {
        setWeather({ temperature: 24, humidity: 65, description: "Partly Cloudy", location: "Cagayan de Oro" })
      }
    }
    fetchWeather()
    const weatherInterval = setInterval(fetchWeather, 600000)
    return () => clearInterval(weatherInterval)
  }, [])

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const SHEET_ID = "1cZNThXFsQjmRc3CAZoInjW29J-tULoOuATgaDi3eQMY"
        const SHEET_NAME = "news"
        const API_KEY = import.meta.env.VITE_GOOGLE_KEY
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_NAME}!A2:D?key=${API_KEY}`
        const response = await axios.get(url)
        if (response.data?.values) {
          setNews(
            response.data.values.map((row: string[]) => ({
              title: row[0] || "",
              category: row[1] || "",
              postUrl: row[2] || "",
              date: row[3] || "",
            }))
          )
        }
      } catch {
        setNews([
          {
            date: "Jan 30, 2026",
            title: "DICT Launches New E-Government Portal",
            category: "Technology",
            postUrl: "https://www.facebook.com/DICTRegion10/posts/pfbid03PeXr1qK2KCrxychWwBFmZxJCJDvFvbavGjKfSmDvmPCNACFJYoYhnBNLPtFaGuNl?rdid=KtQ7kgvJ6MBUYzT9#",
          },
        ])
      }
    }
    fetchNews()
    const newsInterval = setInterval(fetchNews, 300000)
    return () => clearInterval(newsInterval)
  }, [])

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const SHEET_ID = "1cZNThXFsQjmRc3CAZoInjW29J-tULoOuATgaDi3eQMY"
        const SHEET_NAME = "videos"
        const API_KEY = import.meta.env.VITE_GOOGLE_KEY
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_NAME}!A2:B?key=${API_KEY}`
        const response = await axios.get(url)
        if (response.data?.values?.length > 0) {
          setVideos(
            response.data.values.map((row: string[]) => ({
              id: row[0] || "",
              duration: parseInt(row[1]) || 0,
            }))
          )
        }
      } catch {
        // Keep fallback videos
      }
    }
    fetchVideos()
    const videosInterval = setInterval(fetchVideos, 300000)
    return () => clearInterval(videosInterval)
  }, [])

  useEffect(() => { const t = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(t) }, [])

  useEffect(() => {
    const t = setTimeout(() => { if (videoIframeRef.current?.contentWindow) videoIframeRef.current.contentWindow.postMessage(JSON.stringify({ event: "command", func: "unMute", args: [] }), "*") }, 1000)
    return () => clearTimeout(t)
  }, [currentVideoIndex, videos])

  useEffect(() => {
    if (videoAutoNextTimer.current) clearTimeout(videoAutoNextTimer.current)
    if (videos.length > 0 && videos[currentVideoIndex]) {
      const d = videos[currentVideoIndex].duration
      setVideoCountdown(d + 3)
      videoAutoNextTimer.current = setTimeout(() => setCurrentVideoIndex((p) => (p + 1) % videos.length), (d + 3) * 1000)
    }
    return () => { if (videoAutoNextTimer.current) clearTimeout(videoAutoNextTimer.current) }
  }, [currentVideoIndex, videos])

  useEffect(() => {
    if (videoCountdown > 0) { const t = setTimeout(() => setVideoCountdown((p) => p - 1), 1000); return () => clearTimeout(t) }
  }, [videoCountdown])

  useEffect(() => {
    if (isAutoSwipe) autoSwipeTimer.current = setInterval(() => setCurrentPanel((p) => (p + 1) % totalPanels), 10000)
    else if (autoSwipeTimer.current) clearInterval(autoSwipeTimer.current)
    return () => { if (autoSwipeTimer.current) clearInterval(autoSwipeTimer.current) }
  }, [isAutoSwipe, totalPanels])

  useEffect(() => {
    const check = () => { const n = new Date(); const h = n.getHours(); const m = n.getMinutes(); if ((h === 7 && m === 39) || (h === 10 && m === 25)) { const k = `${h}:${m}`; if (localStorage.getItem("lastAutoReload") !== k) { localStorage.setItem("lastAutoReload", k); window.location.reload() } } }
    const t = setInterval(check, 60000); check(); return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (showNewsScrollHint && currentPanel === 1 && newsScrollRef.current) { const el = newsScrollRef.current; let si: NodeJS.Timeout; const sd = setTimeout(() => { si = setInterval(() => { if (el.scrollTop === 0) { el.scrollTo({ top: 15, behavior: "smooth" }); setTimeout(() => el.scrollTo({ top: 0, behavior: "smooth" }), 800) } }, 2500) }, 1000); return () => { clearTimeout(sd); if (si) clearInterval(si) } }
  }, [showNewsScrollHint, currentPanel])
  useEffect(() => {
    if (showEventsScrollHint && currentPanel === 0 && eventsScrollRef.current) { const el = eventsScrollRef.current; let si: NodeJS.Timeout; const sd = setTimeout(() => { si = setInterval(() => { if (el.scrollTop === 0) { el.scrollTo({ top: 15, behavior: "smooth" }); setTimeout(() => el.scrollTo({ top: 0, behavior: "smooth" }), 800) } }, 2500) }, 1000); return () => { clearTimeout(sd); if (si) clearInterval(si) } }
  }, [showEventsScrollHint, currentPanel])
  useEffect(() => {
    if (showAnnouncementsScrollHint && currentPanel === 2 && announcementsScrollRef.current) { const el = announcementsScrollRef.current; let si: NodeJS.Timeout; const sd = setTimeout(() => { si = setInterval(() => { if (el.scrollTop === 0) { el.scrollTo({ top: 15, behavior: "smooth" }); setTimeout(() => el.scrollTo({ top: 0, behavior: "smooth" }), 800) } }, 2500) }, 1000); return () => { clearTimeout(sd); if (si) clearInterval(si) } }
  }, [showAnnouncementsScrollHint, currentPanel])
  useEffect(() => {
    if (showServicesScrollHint && !selectedService && searchQuery === "" && servicesScrollRef.current) { const el = servicesScrollRef.current; let si: NodeJS.Timeout; const sd = setTimeout(() => { si = setInterval(() => { if (el.scrollTop === 0) { el.scrollTo({ top: 20, behavior: "smooth" }); setTimeout(() => el.scrollTo({ top: 0, behavior: "smooth" }), 800) } }, 2500) }, 1500); return () => { clearTimeout(sd); if (si) clearInterval(si) } }
  }, [showServicesScrollHint, selectedService, searchQuery])

  const nextVideo = () => setCurrentVideoIndex((p) => (p + 1) % videos.length)
  const prevVideo = () => setCurrentVideoIndex((p) => (p - 1 + videos.length) % videos.length)
  const handleSearch = () => console.log("Searching:", searchQuery)
  const handleServiceClick = (s: CitizenService) => { setSelectedService(s); setTimeout(() => detailScrollRef.current?.scrollTo({ top: 0 }), 0) }
  const handleBackToList = () => { setSelectedService(null); setTimeout(() => servicesScrollRef.current?.scrollTo({ top: 0 }), 0) }
  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX)
  const handleTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX)
  const handleTouchEnd = () => { if (touchStart - touchEnd > 75) setCurrentPanel(1); if (touchStart - touchEnd < -75) setCurrentPanel(0) }
  const nextPanel = () => setCurrentPanel((p) => (p + 1) % totalPanels)
  const prevPanel = () => setCurrentPanel((p) => (p - 1 + totalPanels) % totalPanels)
  const toggleAutoSwipe = () => setIsAutoSwipe((p) => !p)
  const handleNewsScroll = (e: React.UIEvent<HTMLDivElement>) => { const el = e.currentTarget; const b = el.scrollHeight - el.scrollTop <= el.clientHeight + 10; if (el.scrollHeight <= el.clientHeight || b) setShowNewsScrollHint(false); else if (el.scrollTop === 0) setShowNewsScrollHint(true) }
  const handleEventsScroll = (e: React.UIEvent<HTMLDivElement>) => { const el = e.currentTarget; const b = el.scrollHeight - el.scrollTop <= el.clientHeight + 10; if (el.scrollHeight <= el.clientHeight || b) setShowEventsScrollHint(false); else if (el.scrollTop === 0) setShowEventsScrollHint(true) }
  const handleAnnouncementsScroll = (e: React.UIEvent<HTMLDivElement>) => { const el = e.currentTarget; const b = el.scrollHeight - el.scrollTop <= el.clientHeight + 10; if (el.scrollHeight <= el.clientHeight || b) setShowAnnouncementsScrollHint(false); else if (el.scrollTop === 0) setShowAnnouncementsScrollHint(true) }
  const handleServicesScroll = (e: React.UIEvent<HTMLDivElement>) => { const el = e.currentTarget; const b = el.scrollHeight - el.scrollTop <= el.clientHeight + 10; if (el.scrollHeight <= el.clientHeight || b) setShowServicesScrollHint(false); else if (el.scrollTop === 0) setShowServicesScrollHint(true) }
  const formatTime = (d: Date) => d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  const handleKeyPress = (key: string) => {
    if (key === "Backspace") setSearchQuery((p) => p.slice(0, -1))
    else if (key === "Space") setSearchQuery((p) => p + " ")
    else if (key === "Clear") setSearchQuery("")
    else if (key === "Close") { setShowKeyboard(false); searchInputRef.current?.blur() }
    else setSearchQuery((p) => p + key)
  }

  const renderHtml = (text: string | null | undefined) => {
    if (!text) return null
    return <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(text) }} />
  }


  const renderRequirementsTable = (rows: RequirementItem[]) => (
    <div className="w-full text-sm rounded-lg overflow-hidden border border-[#0038A8]/20">
      <div className="grid grid-cols-[3fr_1fr]">
        <div className="bg-[#0038A8] text-white font-semibold p-2">CHECKLIST OF REQUIREMENTS</div>
        <div className="bg-[#0038A8] text-white font-semibold p-2 border-l border-[#002D85]">WHERE TO SECURE</div>
      </div>
      {rows.map((r, i) => (
        <div key={i} className={`grid grid-cols-[3fr_1fr] ${i % 2 === 0 ? "bg-white" : "bg-[#0038A8]/5"}`}>
          <div className="p-2 text-slate-700 border-t border-r border-[#0038A8]/10 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(r.checklist_of_requirements) }} />
          <div className="p-2 text-slate-600 border-t border-[#0038A8]/10 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(r.where_to_secure) }} />
        </div>
      ))}
    </div>
  )

  const renderRequirements = (reqs: CitizenService["checklist_of_requirements"]) => {
    if (Array.isArray(reqs)) return <div className="overflow-x-auto">{renderRequirementsTable(reqs)}</div>
    return (
      <div className="space-y-4">
        {Object.entries(reqs).map(([k, items]) => (
          <div key={k}>
            <p className="text-sm font-semibold text-[#0038A8] capitalize mb-1">{k.replace(/_/g, " ")}</p>
            <div className="overflow-x-auto">{renderRequirementsTable(items as RequirementItem[])}</div>
          </div>
        ))}
      </div>
    )
  }

  // ── Reusable officer card ─────────────────────────────────────────────────
  const OfficerCard = ({ po }: { po: OfficerData }) => (
    <div
      className="relative rounded-2xl overflow-hidden shadow-2xl transition-transform duration-200 hover:-translate-y-0.5"
      style={{ background: "linear-gradient(135deg, #0f2460 0%, #1a3a8f 50%, #0e1f5e 100%)" }}
    >
      <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10 pointer-events-none" style={{ background: "radial-gradient(circle, #ffffff, transparent)", transform: "translate(30%, -30%)" }} />
      <div className="absolute bottom-0 left-0 w-28 h-28 rounded-full opacity-10 pointer-events-none" style={{ background: "radial-gradient(circle, #facc15, transparent)", transform: "translate(-30%, 30%)" }} />

      <div className="relative flex items-center gap-5 p-5">
        {/* Photo */}
        <div className="flex-shrink-0">
          <div className="w-40 h-40 rounded-full overflow-hidden shadow-xl flex items-center justify-center bg-[#0038A8]">
            {po.photo
              ? <img src={po.photo} alt={po.name} className="w-full h-full object-cover" />
              : <User className="w-12 h-12 text-white/60" />
            }
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-1.5 bg-yellow-400/20 border border-yellow-400/40 rounded-full px-3 py-0.5 mb-1">
            <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full" />
            <span className="text-yellow-300 text-xs font-bold uppercase tracking-widest">{po.province}</span>
          </div>
          <div className="h-px bg-white/15 mb-2" />
          <p className="text-white text-2xl font-bold leading-tight mb-3">{po.name}</p>
          <div className="space-y-2">
            {/* Email */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-3.5 h-3.5 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
              </div>
              <span className="text-white/80 text-sm truncate">{po.email}</span>
            </div>

             {/* Email */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center flex-shrink-0">
               <PhoneCall className="w-3.5 h-3.5 text-yellow-300" />
              </div>
              <span className="text-white/80 text-sm truncate">{po.tel}</span>
            </div>

            {/* Address — clickable → opens map modal */}
            <button
              onClick={() => setMapModal({ name: po.name, address: po.address, mapUrl: po.map })}
              className="flex items-start gap-2 w-full text-left group/addr"
              title="Click to view location on map"
            >
              <div className="w-6 h-6 rounded-md bg-white/10 group-hover/addr:bg-yellow-400/30 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors duration-150">
                <svg className="w-3.5 h-3.5 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-white/80 text-sm leading-snug group-hover/addr:text-yellow-300 group-hover/addr:underline transition-colors duration-150 flex-1">
                {po.address}
              </span>
              {/* Hover hint */}
              <span className="flex-shrink-0 self-start mt-0.5 bg-yellow-400/20 border border-yellow-400/40 rounded-full px-2 py-0.5 text-yellow-300 text-xs font-semibold whitespace-nowrap opacity-0 group-hover/addr:opacity-100 transition-opacity duration-150">
                View map ↗
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 overflow-hidden">
      {/* Logo bar */}

                      {/* PDF Modal — a plain iframe (browsers render PDFs natively with
                          their own zoom/page controls), same pattern used for the
                          Citizen's Charter tab on the About page. Avoids pulling in
                          react-pdf/react-zoom-pan-pinch for a feature the browser
                          already handles. */}
{showPdfModal && (
  <div
    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in"
    onClick={() => setShowPdfModal(false)}
  >
    <div
      className="bg-white dark:bg-card rounded-2xl shadow-2xl w-full max-w-[80vw] overflow-hidden animate-fade-in-up flex flex-col"
      style={{ height: "90vh" }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="bg-[#0038A8] p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-tight">Citizen's Charter</p>
            <p className="text-white/70 text-xs mt-0.5">CC TARP Regional (External) – 2025</p>
          </div>
        </div>
        <button
          onClick={() => setShowPdfModal(false)}
          className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* PDF */}
      <iframe
        src={PDF_CC_TARP}
        title="Citizen's Charter PDF"
        className="flex-1 min-h-0 w-full bg-gray-100 dark:bg-background"
        style={{ border: "none" }}
      />
    </div>
  </div>
)}

      <div className="w-full bg-white/80 py-3 px-2 flex items-center justify-center shadow-md mb-4 animate-fade-in-down">
        <div className="flex items-center justify-center gap-16 w-full max-w-6xl mx-auto">
          <img src={eGov}  alt="eGov PH" className={`h-10 object-contain transition-transform duration-300 ${activeLogo === 0 ? "animate-wiggle" : ""}`} />
          <img src={eLGU} alt="eLGU" className={`h-10 object-contain transition-transform duration-300 ${activeLogo === 1 ? "animate-wiggle" : ""}`} />
          
          <img src={FreeWiFi} alt="Free WiFi For All" className={`h-20 object-contain transition-transform duration-300 ${activeLogo === 3 ? "animate-wiggle" : ""}`} />
          <img src={NBP} alt="National Broadband Plan" className={`h-10 object-contain transition-transform duration-300 ${activeLogo === 7 ? "animate-wiggle" : ""}`} />
          
          <img src={CyberSec} alt="Cybersecurity" className={`h-20 object-contain transition-transform duration-300 ${activeLogo === 6 ? "animate-wiggle" : ""}`} />
          <img src={PNPKI} alt="Philippine National PKI" className={`h-20 object-contain transition-transform duration-300 ${activeLogo === 8 ? "animate-wiggle" : ""}`} />
          <img src={NIPPSB} alt="ICT Planning, Policy and Standards" className={`h-20 object-contain transition-transform duration-300 ${activeLogo === 9 ? "animate-wiggle" : ""}`} />
          <img src={IIDB} alt="IIDB" className={`h-10 object-contain transition-transform duration-300 ${activeLogo === 4 ? "animate-wiggle" : ""}`} />



          <img src={ILCDB} alt="ILCDB" className={`h-10 object-contain transition-transform duration-300 ${activeLogo === 5 ? "animate-wiggle" : ""}`} />
          <img src={Lakip} alt="Lakip" className={`h-10 object-contain transition-transform duration-300 ${activeLogo === 2 ? "animate-wiggle" : ""}`} />
         
          </div>
      </div>

      <div className="h-[calc(100%-120px)] w-full flex gap-5 p-5 pt-0">
        {/* Left Side */}
        <div className="flex-1 bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-[#0038A8]/10 overflow-hidden relative">
          {showServicesScrollHint && !selectedService && searchQuery === "" && (
            <div className="absolute z-30 flex flex-col justify-center items-center self-center w-full bottom-0 pointer-events-none pb-6 h-36 bg-gradient-to-t animate-fade-in from-white via-white/90 to-transparent">
              <p className="text-[#0038A8] text-xs font-semibold mb-1 drop-shadow-sm">Swipe Down</p>
              <ArrowDownIcon className="w-7 h-7 text-[#0038A8] animate-bounce-slow drop-shadow-sm" />
            </div>
          )}
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-br from-[#0038A8] to-[#001B4D] p-6 shadow-lg" onClick={() => setShowKeyboard(true)}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <FileText className="w-10 h-10 text-white"   onClick={() => setShowPdfModal(true)} />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white tracking-tight cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setShowPdfModal(true)}>
                    {selectedService ? renderHtml(selectedService.title) : "Citizen's Charter"}
                  </h1>
                  {!selectedService && <p className="text-blue-100 text-base">Browse available government services</p>}
                </div>
              </div>
              {!selectedService && (
                <div className="relative">
                  <Search className="absolute z-30 left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#0038A8]" />
                  <Input ref={searchInputRef} type="text" placeholder="Search services by name or category..." value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)} onFocus={() => setShowKeyboard(true)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    className="w-full h-12 pl-12 pr-4 text-base bg-white/90 backdrop-blur-sm border-0 focus:ring-2 focus:ring-white/50 rounded-xl shadow-lg placeholder:text-blue-300"
                  />
                </div>
              )}
            </div>

            {!selectedService ? (
              <div ref={servicesScrollRef} onScroll={handleServicesScroll} className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar">
                <div className="mb-4">
                  <h2 className="text-2xl font-bold flex items-center gap-2 mb-2 text-[#0038A8]">
                    <span role="img" aria-label="pin">📌</span> LIST OF ALL EXTERNAL SERVICES
                  </h2>
                </div>
                <div className="space-y-3">
                  {filteredServices.length > 0 ? (
                    filteredServices.map((item, index) => (
                      <button key={item.id} onClick={() => handleServiceClick(item)}
                        className="w-full group bg-gradient-to-r from-white to-blue-50/50 p-5 rounded-xl border border-[#0038A8]/10 hover:border-[#0038A8] hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex items-center justify-between overflow-hidden relative"
                        style={{ animation: `slideInLeft 0.5s ease-out ${index * 0.05}s both` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-[#0038A8]/0 to-[#0038A8]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="text-left relative z-10">
                          <h3 className="text-2xl font-bold text-slate-800 group-hover:text-[#0038A8] transition-colors">{renderHtml(item.title)}</h3>
                          <p className="text-base text-slate-500 mt-1 line-clamp-2">{renderHtml(item.description)}</p>
                        </div>
                        <div className="relative z-10 flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-[#0038A8] group-hover:bg-[#002D85] flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                            <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                      <div className="w-24 h-24 bg-gradient-to-br from-[#0038A8]/10 to-[#0038A8]/20 rounded-full flex items-center justify-center mb-4">
                        <Search className="w-12 h-12 text-[#0038A8]/60" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 mb-2">No services found</h3>
                      <p className="text-sm text-slate-500">Try adjusting your search terms or browse all services</p>
                    </div>
                  )}
                </div>


                

                {/* Feedback */}
               

                {/* Regional Director */}
                <div className="mt-8 space-y-4">
                  <h2 className="text-2xl font-bold flex items-center gap-2 text-[#0038A8]">
                    <span role="img" aria-label="pin">📌</span> DICT 10 - Regional Director
                  </h2>
                  <div className="grid grid-cols-1 gap-4">
                    {directorOfficers.map((po, idx) => <OfficerCard key={idx} po={po} />)}
                  </div>
                </div>

                {/* Provincial Officers */}
                <div className="mt-8 space-y-4">
                  <h2 className="text-xl font-bold flex items-center gap-2 text-[#0038A8]">PROVINCIAL OFFICERS</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {provincialOfficers.map((po, idx) => <OfficerCard key={idx} po={po} />)}
                  </div>
                </div>

 <div className="mt-8 bg-gradient-to-br from-[#FCD116]/10 to-[#FCD116]/5 border-l-4 border-[#FCD116] rounded-xl shadow p-6">
                  <h2 className="text-2xl font-bold text-yellow-800 mb-2 flex items-center gap-2">
                    <span role="img" aria-label="pin">📌</span> FEEDBACK AND COMPLAINTS MECHANISM
                  </h2>
                  <div className="flex items-center gap-2 mb-2">
                    <Megaphone className="w-5 h-5 text-yellow-600" />
                    <span className="text-yellow-700 text-lg font-semibold">Feedback and Complaints Mechanism</span>
                  </div>
                  <div className="text-slate-700 text-sm space-y-3">
                    <div>
                      <span className="font-semibold text-yellow-700">How to Send Feedback:</span>
                      <ul className="list-disc ml-6 mt-1 space-y-1">{charterDoc.feedback_and_complaints_mechanism.how_to_send_feedback.map((item, i) => (<li key={i}>{renderHtml(item)}</li>))}</ul>
                    </div>
                    <div>
                      <span className="font-semibold text-yellow-700">How Feedback Is Processed:</span>
                      <ol className="list-decimal ml-6 mt-1 space-y-1">{charterDoc.feedback_and_complaints_mechanism.how_feedbacks_are_processed.map((item, i) => (<li key={i}>{renderHtml(item)}</li>))}</ol>
                    </div>
                    <div>
                      <span className="font-semibold text-yellow-700">How to File a Complaint:</span>
                      <ul className="list-disc ml-6 mt-1 space-y-1">
                        <li>{renderHtml(charterDoc.feedback_and_complaints_mechanism.how_to_file_a_complaint.channel)}</li>
                        <li>Required details:<ul className="list-[circle] ml-6 mt-1">{charterDoc.feedback_and_complaints_mechanism.how_to_file_a_complaint.required_details.map((d, i) => (<li key={i}>{renderHtml(d)}</li>))}</ul></li>
                        <li>Other channels:<ul className="list-[circle] ml-6 mt-1">{charterDoc.feedback_and_complaints_mechanism.how_to_file_a_complaint.other_channels.map((ch, i) => (<li key={i}><b>{ch.name}</b>{"email" in ch && <span>: <span style={{ color: "#1d4ed8" }}>{ch.email}</span></span>}{"hotline" in ch && <span> / Hotline: <b>{ch.hotline}</b></span>}{"contact" in ch && <span>: <b>{ch.contact}</b></span>}</li>))}</ul></li>
                      </ul>
                    </div>
                    <div>
                      <span className="font-semibold text-yellow-700">How Complaints Are Processed:</span>
                      <ol className="list-decimal ml-6 mt-1 space-y-1">{charterDoc.feedback_and_complaints_mechanism.how_complaints_are_processed.map((item, i) => (<li key={i}>{renderHtml(item)}</li>))}</ol>
                    </div>
                    <div>
                      <span className="font-semibold text-yellow-700">Contact Information:</span>
                      <ul className="list-disc ml-6 mt-1">{Object.entries(charterDoc.feedback_and_complaints_mechanism.contact_information_of_ccb_pcc_arta).map(([k, v]) => (<li key={k}>{k}: {v}</li>))}</ul>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col p-6 overflow-hidden animate-fade-in">
                <Button onClick={handleBackToList} variant="ghost" className="w-fit mb-6 text-xl text-[#0038A8] hover:text-[#001233] hover:bg-[#0038A8]/10 rounded-lg group">
                  <ArrowLeft className="w-6 h-6 mr-2 group-hover:-translate-x-1 transition-transform" />Back to Services
                </Button>
                <div ref={detailScrollRef} className="flex-1 overflow-y-auto custom-scrollbar space-y-5">
                  <div className="bg-gradient-to-r from-[#0038A8] via-[#002D85] to-[#001233] text-white p-6 rounded-xl shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center"><FileText className="w-8 h-8" /></div>
                      <div>
                        <p className="text-blue-100 text-base font-medium mb-1">DICT External Service</p>
                        <p className="text-2xl font-bold">{renderHtml(selectedService.title)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-slate-100 p-6 rounded-xl border-l-4 border-[#0038A8] shadow-sm space-y-5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white rounded-lg p-3 border border-[#0038A8]/10"><p className="text-xs font-semibold text-[#0038A8] uppercase tracking-wide mb-1">Office / Division</p><p className="text-sm text-slate-700">{renderHtml(selectedService.office_or_division)}</p></div>
                      <div className="bg-white rounded-lg p-3 border border-[#0038A8]/10"><p className="text-xs font-semibold text-[#0038A8] uppercase tracking-wide mb-1">Classification</p><p className="text-sm text-slate-700">{renderHtml(selectedService.classification)}</p></div>
                      <div className="bg-white rounded-lg p-3 border border-[#0038A8]/10"><p className="text-xs font-semibold text-[#0038A8] uppercase tracking-wide mb-1">Type of Transaction</p><div className="flex flex-col gap-1">{selectedService.type_of_transaction.map((t, i) => (<p key={i} className="text-sm text-slate-700">{renderHtml(t)}</p>))}</div></div>
                      <div className="bg-white rounded-lg p-3 border border-[#0038A8]/10"><p className="text-xs font-semibold text-[#0038A8] uppercase tracking-wide mb-1">Who May Avail</p><p className="text-sm text-slate-700">{renderHtml(selectedService.who_may_avail)}</p></div>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2"><div className="w-8 h-8 bg-[#0038A8] rounded-lg flex items-center justify-center"><FileText className="w-4 h-4 text-white" /></div>Description</h3>
                      <p className="text-slate-700 text-base leading-relaxed">{renderHtml(selectedService.description)}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-xl text-[#0038A8] mb-2">Checklist of Requirements:</h4>
                      {renderRequirements(selectedService.checklist_of_requirements)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-xl text-[#0038A8] mb-2">Process Flow:</h4>
                      <div className="w-full text-sm rounded-lg overflow-hidden border border-[#0038A8]/20">
                        <div className="grid grid-cols-[2fr_2fr_1fr_1fr_2fr]">
                          <div className="bg-[#0038A8] text-white font-semibold p-2">CLIENT STEPS</div>
                          <div className="bg-[#0038A8] text-white font-semibold p-2 border-l border-[#002D85]">AGENCY ACTION</div>
                          <div className="bg-[#0038A8] text-white font-semibold p-2 border-l border-[#002D85]">FEES TO BE PAID</div>
                          <div className="bg-[#0038A8] text-white font-semibold p-2 border-l border-[#002D85]">PROCESSING TIME</div>
                          <div className="bg-[#0038A8] text-white font-semibold p-2 border-l border-[#002D85]">PERSON RESPONSIBLE</div>
                        </div>
                        {selectedService.process_flow.map((step, idx) => (
                          <div key={idx} className={`grid grid-cols-[2fr_2fr_1fr_1fr_2fr] ${idx % 2 === 0 ? "bg-white" : "bg-[#0038A8]/5"}`}>
                            <div className="p-2 text-slate-700 border-t border-r border-[#0038A8]/10 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(step.client_steps ?? "") }} />
                            <div className="p-2 text-slate-700 border-t border-r border-[#0038A8]/10 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(step.agency_action) }} />
                            <div className="p-2 text-slate-700 border-t border-r border-[#0038A8]/10 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(step.fees_to_be_paid) }} />
                            <div className="p-2 text-slate-700 border-t border-r border-[#0038A8]/10 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(step.processing_time) }} />
                            <div className="p-2 text-slate-700 border-t border-[#0038A8]/10 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(step.person_responsible) }} />
                          </div>
                        ))}
                      </div>
                    </div>
                    {selectedService.total && (
                      <div className="flex gap-4">
                        <div className="flex-1 bg-white rounded-lg p-3 border border-[#0038A8]/10"><p className="text-xs font-semibold text-[#0038A8] uppercase tracking-wide mb-1">Total Fees to be Paid</p><p className="text-base font-bold text-slate-800">{renderHtml(selectedService.total.fees_to_be_paid)}</p></div>
                        <div className="flex-1 bg-white rounded-lg p-3 border border-[#0038A8]/10"><p className="text-xs font-semibold text-[#0038A8] uppercase tracking-wide mb-1">Total Processing Time</p><p className="text-base font-bold text-slate-800">{renderHtml(selectedService.total.processing_time)}</p></div>
                      </div>
                    )}
                    {selectedService.mode_of_payment && (
                      <div className="bg-white rounded-lg p-3 border border-[#0038A8]/10"><p className="text-xs font-semibold text-[#0038A8] uppercase tracking-wide mb-1">Mode of Payment</p><p className="text-sm text-slate-700">{renderHtml(selectedService.mode_of_payment)}</p></div>
                    )}
                    {selectedService.regional_email_contacts && (
                      <div>
                        <h4 className="font-semibold text-xl text-[#0038A8] mb-2">Regional Email Contacts:</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border-collapse">
                            <thead><tr className="bg-[#0038A8] text-white"><th className="p-2 text-left font-semibold w-1/3">Region</th><th className="p-2 text-left font-semibold w-2/3">Email Address</th></tr></thead>
                            <tbody>
                              {Object.entries(selectedService.regional_email_contacts).map(([region, email], i) => (
                                <tr key={region} className={i % 2 === 0 ? "bg-white" : "bg-[#0038A8]/5"}>
                                  <td className="p-2 align-top text-slate-700 font-medium border border-[#0038A8]/10">{region}</td>
                                  <td className="p-2 align-top border border-[#0038A8]/10">
                                    {Array.isArray(email)
                                      ? <div className="flex flex-col gap-1">{email.map((e, idx) => (<a key={idx} href={`mailto:${e}`} className="text-[#0038A8] hover:underline">{e}</a>))}</div>
                                      : <a href={`mailto:${email}`} className="text-[#0038A8] hover:underline">{email}</a>
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
              </div>
            )}
          </div>
        </div>

        {/* Right Side */}
        <div className="w-[30%] flex flex-col gap-4">
          <div className="flex flex-row-reverse gap-2">
            <button onClick={() => setShowFacebookPage(true)} className="w-[70%] h-[80%] self-center bg-white rounded-full flex p-5 animate-fade-in-down items-center justify-center cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105">
              <img src={DictLogo} className="h-[100px] object-contain drop-shadow-lg" alt="DICT Logo" />
            </button>
            <div className="bg-white/95 backdrop-blur-sm w-full rounded-2xl shadow-xl border border-[#0038A8]/10 animate-fade-in-down">
              <div className="bg-gradient-to-br from-[#0038A8] to-[#001B4D] p-4 rounded-xl shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-3xl font-bold text-white">{weather?.temperature || 24}°C</div>
                    <div className="flex items-center gap-1.5 text-xs text-sky-100"><Droplets className="w-3 h-3" /><span>{weather?.humidity || 65}%</span></div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-3xl font-bold text-white tabular-nums mb-1">{formatTime(currentTime)}</div>
                    <div className="text-xs text-blue-100">{currentTime.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                    <div className="flex items-center gap-1.5 text-xs text-sky-100"><MapPin className="w-3 h-3" /><span className="truncate">{weather?.location || "Unknown"}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Panels */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-[#0038A8]/10 p-5 animate-fade-in-down overflow-hidden relative">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                {currentPanel === 0 ? (<><div className="w-8 h-8 bg-[#0038A8] rounded-lg flex items-center justify-center"><Calendar className="w-4 h-4 text-white" /></div>Events</>) : currentPanel === 1 ? (<><div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center"><Newspaper className="w-4 h-4 text-white" /></div>News</>) : (<><div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center"><Megaphone className="w-4 h-4 text-white" /></div>Announcements</>)}
              </h2>
              <div className="flex gap-1.5">
                <button onClick={toggleAutoSwipe} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${!isAutoSwipe ? "bg-[#0038A8] text-white shadow-md" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}>
                  {!isAutoSwipe ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                </button>
                <button onClick={prevPanel} className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 hover:bg-slate-200 transition-colors"><ChevronLeft className="w-4 h-4 text-slate-600" /></button>
                <button onClick={nextPanel} className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 hover:bg-slate-200 transition-colors"><ChevronRight className="w-4 h-4 text-slate-600" /></button>
              </div>
            </div>
            <div className="relative overflow-hidden" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
              <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${currentPanel * 100}%)` }}>
                {/* Events */}
                <div className="w-full flex-shrink-0 relative">
                  <div ref={eventsScrollRef} className="space-y-2.5 max-h-[200px] overflow-y-auto custom-scrollbar" onScroll={handleEventsScroll}>
                    {events.slice(0, 4).map((event, index) => (
                      <div key={index} onClick={() => setSelectedEvent(event)} className="group cursor-pointer bg-gradient-to-r from-blue-50 to-white p-4 rounded-lg border-l-4 border-[#0038A8] hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                        <h3 className="text-sm font-bold text-slate-800 group-hover:text-[#0038A8] mb-2">{event.title}</h3>
                        <p className="text-xs text-slate-600 mb-2 line-clamp-2">{event.description}</p>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500"><Calendar className="w-3 h-3" />{event.date}</div>
                          <span className="px-2.5 py-1 bg-[#0038A8] text-white rounded-lg text-xs font-semibold">{event.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {showEventsScrollHint && currentPanel === 0 && (<div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none flex items-end justify-center pb-1"><div className="animate-bounce-slow"><svg className="w-6 h-6 text-[#0038A8]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg></div></div>)}
                </div>
                {/* News */}
                <div className="w-full flex-shrink-0 relative">
                  <div ref={newsScrollRef} className="space-y-2.5 max-h-[200px] overflow-y-auto custom-scrollbar" onScroll={handleNewsScroll}>
                    {news.map((item, index) => (
                      <div key={index} onClick={() => setSelectedNews(item)} className="group cursor-pointer bg-slate-100 rounded-lg border border-emerald-200 hover:shadow-lg transition-all overflow-hidden relative flex">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 z-10 flex items-end justify-center pb-2">
                          <div className="absolute z-10 self-center text-white">{item?.title}</div>
                          <span className="text-white text-xs font-semibold flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>Click to view full post</span>
                        </div>
                        <iframe src={`https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(item.postUrl)}&show_text=true`} className="w-full h-[140px] border-0 pointer-events-none" scrolling="no" frameBorder="0" allowFullScreen allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" />
                      </div>
                    ))}
                  </div>
                  {showNewsScrollHint && currentPanel === 1 && (<div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none flex items-end justify-center pb-1"><div className="animate-bounce-slow"><svg className="w-6 h-6 text-[#0038A8]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg></div></div>)}
                </div>
                {/* Announcements */}
                <div className="w-full flex-shrink-0 relative">
                  <div ref={announcementsScrollRef} className="space-y-2.5 max-h-[200px] overflow-y-auto custom-scrollbar" onScroll={handleAnnouncementsScroll}>
                    {announcements.map((item, index) => (
                      <div key={index} onClick={() => setSelectedAnnouncement(item)} className="group cursor-pointer bg-gradient-to-r from-orange-50 to-white p-4 rounded-lg border-l-4 border-orange-500 hover:shadow-md transition-all hover:-translate-y-0.5">
                        <h3 className="text-sm font-bold text-slate-800 group-hover:text-orange-700 mb-2">{item.title}</h3>
                        <p className="text-xs text-slate-600 mb-2 line-clamp-2">{item.description}</p>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500"><Calendar className="w-3 h-3" />{item.date}</div>
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${item.priority === "High" ? "bg-red-500 text-white" : item.priority === "Medium" ? "bg-amber-500 text-white" : "bg-slate-400 text-white"}`}>{item.priority}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {showAnnouncementsScrollHint && currentPanel === 2 && (<div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none flex items-end justify-center pb-1"><div className="animate-bounce-slow"><svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg></div></div>)}
                </div>
              </div>
            </div>
            <div className="flex justify-center gap-2 mt-4">
              {[0, 1, 2].map((index) => (<button key={index} onClick={() => setCurrentPanel(index)} className={`h-2 rounded-full transition-all duration-300 ${index === currentPanel ? "w-8 bg-blue-600" : "w-2 bg-slate-300 hover:bg-slate-400"}`} />))}
            </div>
          </div>

          {/* Video */}
          <div className="flex-1 min-h-0 bg-white backdrop-blur-sm rounded-2xl shadow-xl border border-[#0038A8]/10 p-4 pb-2 flex flex-col animate-fade-in-up">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-md">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-800">Featured Videos</h3>
                  {videoCountdown > 0 && <span className="px-2 py-1 bg-[#0038A8]/10 text-[#0038A8] rounded-lg text-xs font-semibold">{Math.floor(videoCountdown / 60)}:{String(videoCountdown % 60).padStart(2, "0")}</span>}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={prevVideo} className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 hover:bg-slate-200 transition-colors"><ChevronLeft className="w-4 h-4 text-slate-600" /></button>
                <button onClick={nextVideo} className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 hover:bg-slate-200 transition-colors"><ChevronRight className="w-4 h-4 text-slate-600" /></button>
              </div>
            </div>
            <div className="flex-1 min-h-0 relative rounded-xl overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 shadow-2xl">
              {videos.length > 0 && videos[currentVideoIndex] && (
                <iframe ref={videoIframeRef} key={`${currentVideoIndex}-${videos[currentVideoIndex].id}`} className="w-full h-full"
                  src={`https://www.youtube.com/embed/${videos[currentVideoIndex].id}?autoplay=1&mute=1&rel=0&enablejsapi=1&controls=1&modestbranding=1`}
                  title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              )}
            </div>
            <div className="flex items-center justify-center gap-2 mt-2">
              {videos.map((_, index) => (
                <button key={index} onClick={() => setCurrentVideoIndex(index)} className={`group relative transition-all duration-300 ${index === currentVideoIndex ? "w-10" : "w-2.5"}`}>
                  <div className={`h-2 rounded-full transition-all duration-300 ${index === currentVideoIndex ? "bg-gradient-to-r from-[#0038A8] to-[#001233] shadow-lg" : "bg-slate-300 group-hover:bg-slate-400"}`} />
                  {index === currentVideoIndex && <div className="absolute inset-0 bg-[#0038A8] rounded-full animate-ping opacity-20" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Map Modal ──────────────────────────────────────────────────────── */}
      {mapModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in" onClick={() => setMapModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0038A8] to-[#001233] p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-white font-bold text-base leading-tight truncate">{mapModal.name}</p>
                  <p className="text-blue-200 text-xs mt-0.5 leading-snug line-clamp-2">{mapModal.address}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={`https://www.google.com/maps?q=${mapModal.mapUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 border border-white/30 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                  </svg>
                  Open in Google Maps
                </a>
                <button onClick={() => setMapModal(null)} className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            {/* Map iframe — extracts @lat,lng from the Google Maps URL and
                 uses maps.google.com/maps?q=lat,lng&output=embed which always
                 renders with a pin on the exact location, no API key needed */}
            <div style={{ height: "480px" }}>
              {(() => {
                // mapUrl is now a clean "lat,lng" string
                const src = `https://maps.google.com/maps?q=${mapModal.mapUrl}&z=17&output=embed`
                return (
                  <iframe
                    src={src}
                    className="w-full h-full border-0"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={`Map – ${mapModal.name}`}
                  />
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Virtual Keyboard */}
      {showKeyboard && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-end justify-center animate-fade-in" onClick={() => setShowKeyboard(false)}>
          <div className="bg-white w-full max-w-4xl rounded-t-3xl shadow-2xl p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Search className="w-5 h-5 text-[#0038A8]" />Virtual Keyboard</h3>
              <button onClick={() => setShowKeyboard(false)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="mb-4 bg-gradient-to-br from-blue-50 to-slate-100 rounded-xl p-4 border-2 border-[#0038A8]/20">
              <div className="flex items-center gap-2 text-sm text-slate-600 mb-2"><Search className="w-4 h-4" /><span>Search Query:</span></div>
              <div className="text-xl font-semibold text-slate-800 min-h-[32px]">{searchQuery || <span className="text-slate-400">Start typing...</span>}</div>
            </div>
            <div className="space-y-2">
              <div className="flex gap-2 justify-center">{["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"].map((k) => (<button key={k} onClick={() => handleKeyPress(k.toLowerCase())} className="w-12 h-12 bg-gradient-to-br from-[#0038A8] to-[#002D85] hover:from-[#002D85] hover:to-[#001B4D] text-white font-bold rounded-lg shadow-md active:scale-95 transition-all">{k}</button>))}</div>
              <div className="flex gap-2 justify-center">{["A", "S", "D", "F", "G", "H", "J", "K", "L"].map((k) => (<button key={k} onClick={() => handleKeyPress(k.toLowerCase())} className="w-12 h-12 bg-gradient-to-br from-[#0038A8] to-[#002D85] hover:from-[#002D85] hover:to-[#001B4D] text-white font-bold rounded-lg shadow-md active:scale-95 transition-all">{k}</button>))}</div>
              <div className="flex gap-2 justify-center">{["Z", "X", "C", "V", "B", "N", "M"].map((k) => (<button key={k} onClick={() => handleKeyPress(k.toLowerCase())} className="w-12 h-12 bg-gradient-to-br from-[#0038A8] to-[#002D85] hover:from-[#002D85] hover:to-[#001B4D] text-white font-bold rounded-lg shadow-md active:scale-95 transition-all">{k}</button>))}</div>
              <div className="flex gap-2 justify-center">
                <button onClick={() => handleKeyPress("Clear")} className="w-20 h-12 bg-gradient-to-br from-red-500 to-red-600 text-white font-semibold rounded-lg shadow-md active:scale-95 text-sm">Clear</button>
                <button onClick={() => handleKeyPress("Space")} className="flex-1 h-12 bg-gradient-to-br from-slate-400 to-slate-500 text-white font-semibold rounded-lg shadow-md active:scale-95">Space</button>
                <button onClick={() => handleKeyPress("Backspace")} className="w-20 h-12 bg-gradient-to-br from-orange-500 to-orange-600 text-white font-semibold rounded-lg shadow-md active:scale-95 text-sm">← Back</button>
                <button onClick={() => handleKeyPress("Close")} className="w-20 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-semibold rounded-lg shadow-md active:scale-95 text-sm">Done</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in" onClick={() => setSelectedEvent(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-[#0038A8] to-[#002D85] p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center"><Calendar className="w-6 h-6 text-white" /></div>
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedEvent.title}</h3>
                  <div className="flex items-center gap-3 mt-1"><span className="text-blue-100 text-sm">{selectedEvent.date}</span><span className="text-blue-100 text-sm">•</span><span className="text-blue-100 text-sm">{selectedEvent.time}</span></div>
                </div>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="w-10 h-10 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center"><svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar" style={{ maxHeight: "calc(90vh - 120px)" }}>
              <div className="bg-gradient-to-br from-blue-50 to-slate-100 rounded-xl p-6 border-l-4 border-[#0038A8]">
                <h4 className="text-lg font-bold text-slate-800 mb-3">Event Details</h4>
                <p className="text-slate-700 leading-relaxed">{selectedEvent.description}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Announcement Modal */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in" onClick={() => setSelectedAnnouncement(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center"><Megaphone className="w-6 h-6 text-white" /></div>
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedAnnouncement.title}</h3>
                  <div className="flex items-center gap-3 mt-1"><span className="text-orange-100 text-sm">{selectedAnnouncement.date}</span><span className="text-orange-100 text-sm">•</span><span className={`px-2 py-0.5 rounded text-xs font-semibold ${selectedAnnouncement.priority === "High" ? "bg-red-500 text-white" : selectedAnnouncement.priority === "Medium" ? "bg-yellow-500 text-white" : "bg-green-500 text-white"}`}>{selectedAnnouncement.priority} Priority</span></div>
                </div>
              </div>
              <button onClick={() => setSelectedAnnouncement(null)} className="w-10 h-10 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center"><svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar" style={{ maxHeight: "calc(90vh - 120px)" }}>
              <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl p-6 border-l-4 border-orange-500">
                <h4 className="text-lg font-bold text-slate-800 mb-3">Announcement Details</h4>
                <p className="text-slate-700 leading-relaxed">{selectedAnnouncement.description}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* News Modal */}
      {selectedNews && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in" onClick={() => setSelectedNews(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[95vh] overflow-hidden animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-[#0038A8] to-[#002D85] p-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedNews.title}</h2>
                <div className="flex items-center gap-3 mt-1"><span className="text-emerald-100 text-sm flex items-center gap-1"><Calendar className="w-3 h-3" />{selectedNews.date}</span><span className="px-2 py-0.5 bg-white/20 text-white rounded text-xs font-semibold">{selectedNews.category}</span></div>
              </div>
              <button onClick={() => setSelectedNews(null)} className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center"><svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="overflow-y-auto custom-scrollbar p-4" style={{ maxHeight: "calc(95vh - 100px)" }}>
              <iframe src={`https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(selectedNews.postUrl)}&show_text=true&width=734`} className="w-full border-0 bg-white rounded-lg" style={{ minHeight: "700px" }} frameBorder="0" sandbox="allow-scripts allow-same-origin allow-forms" allowFullScreen allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" />
            </div>
          </div>
        </div>
      )}

      {/* Facebook Modal */}
      {showFacebookPage && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in" onClick={() => setShowFacebookPage(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[540px] max-h-[95vh] overflow-hidden animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-[#0038A8] to-[#002D85] p-4 flex items-center justify-between">
              <div><h2 className="text-xl font-bold text-white">DICT Region 10</h2><p className="text-blue-100 text-sm">Facebook Page</p></div>
              <button onClick={() => setShowFacebookPage(false)} className="w-10 h-10 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center"><svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="overflow-y-auto custom-scrollbar bg-gray-50 p-4" style={{ maxHeight: "calc(95vh - 100px)" }}>
              <iframe src="https://www.facebook.com/plugins/page.php?href=https%3A%2F%2Fwww.facebook.com%2FDICTRegion10&tabs=timeline&width=865&height=700&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true&appId" className="w-full border-0 bg-white rounded-lg" style={{ minHeight: "700px" }} frameBorder="0" scrolling="yes" sandbox="allow-scripts allow-same-origin allow-forms allow-popups-to-escape-sandbox" allowFullScreen allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" />
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes wiggle{0%{transform:rotate(0deg) scale(1)}15%{transform:rotate(-10deg) scale(1.1)}30%{transform:rotate(10deg) scale(1.1)}45%{transform:rotate(-8deg) scale(1.08)}60%{transform:rotate(8deg) scale(1.08)}75%{transform:rotate(-4deg) scale(1.04)}90%{transform:rotate(4deg) scale(1.04)}100%{transform:rotate(0deg) scale(1)}}
        .animate-wiggle{animation:wiggle 1s ease-in-out}
        @keyframes slideInLeft{from{opacity:0;transform:translateX(-30px)}to{opacity:1;transform:translateX(0)}}
        @keyframes fade-in{from{opacity:0}to{opacity:1}}
        @keyframes fade-in-down{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fade-in-up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        .animate-fade-in{animation:fade-in 0.6s ease-out}
        .animate-fade-in-down{animation:fade-in-down 0.6s ease-out}
        .animate-fade-in-up{animation:fade-in-up 0.6s ease-out}
        @keyframes slide-up{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}
        .animate-slide-up{animation:slide-up 0.3s ease-out}
        @keyframes bounce-slow{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        .animate-bounce-slow{animation:bounce-slow 2s ease-in-out infinite}
        .custom-scrollbar::-webkit-scrollbar{width:6px}
        .custom-scrollbar::-webkit-scrollbar-track{background:#f1f5f9;border-radius:10px}
        .custom-scrollbar::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:10px}
        .custom-scrollbar::-webkit-scrollbar-thumb:hover{background:#94a3b8}
      `}</style>
    </div>
  )
}

export default CitizenCharter
