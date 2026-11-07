import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Alert, Card, CardContent, CardHeader, CardTitle, Select, Spinner } from '../ui'
import { estateApi, type AdminAnalytics } from '../../services/estateApi'

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const shortDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

function Metric({ label, value, detail, index }: { label: string; value: string; detail: string; index: number }) {
  return <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }} className="rounded-2xl border border-sand-200/80 bg-white p-5 shadow-[0_8px_25px_-22px_rgba(13,32,24,0.4)]"><p className="text-xs font-medium tracking-wide text-sand-500">{label}</p><p className="mt-3 font-display text-3xl font-semibold tracking-tight text-brand-900">{value}</p><p className="mt-2 text-[0.68rem] text-sand-500">{detail}</p></motion.div>
}

export function Overview({ token }: { token: string }) {
  const [data, setData] = useState<AdminAnalytics | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(14)
  useEffect(() => {
    let live = true
    setLoading(true); setError(null)
    estateApi.adminAnalytics(token, days).then((result) => { if (live) setData(result) }).catch((cause: unknown) => { if (live) setError(cause instanceof Error ? cause.message : 'Analytics unavailable') }).finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [token, days])

  if (loading) return <div className="flex min-h-80 items-center justify-center"><Spinner className="size-8" /></div>
  if (error || !data) return <Alert variant="danger" title="Could not load analytics">{error ?? 'No analytics data returned.'}</Alert>

  const status = Object.entries(data.statusCounts).map(([name, value]) => ({ name: name.replace('_', ' '), value }))
  const chart = data.dailyBookings.map((item) => ({ ...item, label: shortDate(item.date) }))

  return <div>
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[0.62rem] font-semibold tracking-[0.2em] text-gold-600 uppercase">The estate at a glance</p><h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-brand-900">Good morning. Here’s your pulse.</h2><p className="mt-2 text-sm text-sand-500">Live operating summary · {data.period.from} — {data.period.to}</p></div><Select label="Analytics period" value={String(days)} onChange={(event) => setDays(Number(event.target.value))} className="w-full min-w-40 sm:w-auto"><option value="7">Last 7 days</option><option value="14">Last 14 days</option><option value="30">Last 30 days</option><option value="60">Last 60 days</option></Select></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric index={0} label="Paid revenue · all time" value={money.format(data.metrics.paidRevenue)} detail="Confirmed payments only" />
      <Metric index={1} label={`Bookings · ${data.period.days} days`} value={String(data.metrics.bookingsInPeriod)} detail={`${data.statusCounts.confirmed ?? 0} confirmed · ${data.statusCounts.pending ?? 0} pending`} />
      <Metric index={2} label="Website occupancy" value={`${data.metrics.occupancyPercent}%`} detail={`Inventory over the last ${data.period.days} days`} />
      <Metric index={3} label="Active residences" value={String(data.metrics.activeRooms)} detail={`${data.metrics.pendingPayments} pending payments`} />
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[1.6fr_1fr]">
      <Card className="rounded-2xl border-sand-200 bg-white shadow-none"><CardHeader className="px-5 pt-5"><CardTitle className="font-sans text-sm font-semibold tracking-normal text-brand-900">Bookings & paid revenue</CardTitle><p className="text-xs text-sand-500">By check-in date · last {data.period.days} days</p></CardHeader><CardContent className="px-2 pb-5 pt-4 sm:px-5"><div className="h-[300px] w-full">
        {chart.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={chart} margin={{ left: -12, right: 8, top: 8, bottom: 0 }}><defs><linearGradient id="adminRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c3943a" stopOpacity={0.3} /><stop offset="95%" stopColor="#c3943a" stopOpacity={0.01} /></linearGradient></defs><CartesianGrid stroke="#ece9df" strokeDasharray="3 4" vertical={false} /><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#958c74', fontSize: 11 }} /><YAxis yAxisId="left" tickLine={false} axisLine={false} tick={{ fill: '#958c74', fontSize: 11 }} allowDecimals={false} /><YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tick={{ fill: '#958c74', fontSize: 10 }} tickFormatter={(value) => value ? `₹${Math.round(value / 1000)}k` : '₹0'} /><Tooltip labelStyle={{ color: '#1a352b', fontWeight: 600 }} formatter={(value, name) => name === 'Paid revenue' ? money.format(Number(value)) : Number(value)} contentStyle={{ borderRadius: 12, borderColor: '#e6e2d4', boxShadow: '0 12px 30px #1a352b12' }} /><Area yAxisId="right" type="monotone" dataKey="paidRevenue" name="Paid revenue" stroke="#c3943a" strokeWidth={2.5} fill="url(#adminRevenue)" /><Area yAxisId="left" type="monotone" dataKey="bookings" name="Bookings" stroke="#2e644f" strokeWidth={2.5} fill="transparent" /></AreaChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-sand-500">No check-ins recorded during this period yet.</div>}
      </div></CardContent></Card>

      <Card className="rounded-2xl border-sand-200 bg-white shadow-none"><CardHeader className="px-5 pt-5"><CardTitle className="font-sans text-sm font-semibold tracking-normal text-brand-900">Booking status</CardTitle><p className="text-xs text-sand-500">Bookings created in this period</p></CardHeader><CardContent className="px-5 pb-5 pt-4"><div className="h-[225px]">{status.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={status} margin={{ left: -20, right: 5, top: 5, bottom: 0 }}><CartesianGrid stroke="#ece9df" strokeDasharray="3 4" vertical={false} /><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#7b725d', fontSize: 11 }} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#958c74', fontSize: 11 }} /><Tooltip cursor={{ fill: '#f7f4ec' }} contentStyle={{ borderRadius: 12, borderColor: '#e6e2d4' }} /><Bar dataKey="value" name="Bookings" fill="#2e644f" radius={[6, 6, 0, 0]} maxBarSize={44} /></BarChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-sand-500">No bookings yet.</div>}</div><div className="mt-5 rounded-xl bg-brand-50 px-4 py-3 text-xs leading-relaxed text-brand-800">Website allotment is checked and claimed by the API at booking time to prevent overselling.</div></CardContent></Card>
    </div>

    <Card className="mt-5 rounded-2xl border-sand-200 bg-white shadow-none"><CardHeader className="pb-3"><p className="text-[0.62rem] font-semibold tracking-[0.18em] text-gold-600 uppercase">Client-supplied planning assumptions</p><CardTitle className="font-display text-2xl text-brand-900">Indicative annual opportunity · ₹1.05 crore</CardTitle><p className="max-w-4xl text-xs leading-relaxed text-sand-500">Illustrative business case, not live results: 76 keys × 62% occupancy × ₹9,500 average tariff; 68% OTA mix at 20% commission; plus event enquiry response/contribution assumptions. Actual direct share and savings require PMS/channel booking data.</p></CardHeader><CardContent className="grid gap-3 border-t border-sand-100 pt-4 sm:grid-cols-2 xl:grid-cols-4"><div className="rounded-xl bg-sand-50 p-4"><p className="text-xs text-sand-500">OTA commission savings opportunity</p><p className="mt-1 font-display text-2xl font-semibold text-brand-900">₹33.3 lakh</p><p className="mt-1 text-[0.65rem] text-sand-500">If 15% of OTA room nights shift direct</p></div><div className="rounded-xl bg-sand-50 p-4"><p className="text-xs text-sand-500">Event conversion opportunity</p><p className="mt-1 font-display text-2xl font-semibold text-brand-900">₹72 lakh</p><p className="mt-1 text-[0.65rem] text-sand-500">Illustrative annual contribution at risk</p></div><div className="rounded-xl bg-brand-50 p-4"><p className="text-xs text-brand-700">Direct share objective</p><p className="mt-1 font-display text-2xl font-semibold text-brand-900">12% → 20%</p><p className="mt-1 text-[0.65rem] text-brand-700">Target over 12 months; not yet measured here</p></div><div className="rounded-xl bg-brand-50 p-4"><p className="text-xs text-brand-700">First-response objective</p><p className="mt-1 font-display text-2xl font-semibold text-brand-900">Under 30 min</p><p className="mt-1 text-[0.65rem] text-brand-700">Median during working hours; requires live reply timestamps</p></div></CardContent></Card>
  </div>
}
