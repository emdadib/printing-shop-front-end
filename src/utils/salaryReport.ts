import type { EmployeeMonthRow, EmployeeYear, MonthReport } from '@/services/salaryApi'

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const fullName = (p: { firstName: string; lastName: string }) =>
  `${p.firstName} ${p.lastName}`.trim()

/** Today's date as YYYY-MM-DD in local time (for date inputs). */
export const todayIso = (): string => {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** True when the given period is still running (or in the future). */
export const isPeriodUnfinished = (month: number, year: number, now = new Date()): boolean => {
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  return year > y || (year === y && month >= m)
}

export type NetTone = 'pay' | 'owe' | 'even'

/**
 * Plain-language description of a row's net position.
 *  - pay : the company still owes the employee this much
 *  - owe : the employee took more than they earned; this is carried forward
 *  - even: nothing to pay either way
 */
export const describeNet = (
  row: Pick<EmployeeMonthRow, 'status' | 'paidAmount' | 'carryForward'>
): { tone: NetTone; amount: number; label: string } => {
  if (row.paidAmount > 0) {
    return {
      tone: 'pay',
      amount: row.paidAmount,
      label: row.status === 'PROCESSED' ? 'Paid at processing' : 'To pay at processing',
    }
  }
  if (row.carryForward > 0) {
    return {
      tone: 'owe',
      amount: row.carryForward,
      label: row.status === 'PROCESSED' ? 'Owes the company' : 'Would owe the company',
    }
  }
  return { tone: 'even', amount: 0, label: 'Nothing left to pay' }
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

export const csvCell = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return ''
  const text = typeof value === 'number' ? String(value) : value
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

const csvLine = (cells: (string | number | null | undefined)[]) => cells.map(csvCell).join(',')

export function monthReportToCsv(report: MonthReport): string {
  const header = [
    'Employee', 'Role', 'Status', 'Base salary', 'Given during month', 'Payout count',
    'Deductions', 'Bonus', 'Owed before', 'Net', 'Paid at processing', 'Owed after', 'Processed on',
  ]
  const lines = [csvLine([`${report.label} salary`]), csvLine(header)]
  for (const row of report.rows) {
    lines.push(
      csvLine([
        fullName(row.user),
        row.user.role ?? '',
        row.status === 'PROCESSED' ? 'Processed' : 'Open',
        row.baseSalary,
        row.payoutsTotal,
        row.payoutsCount,
        row.deductions,
        row.bonuses,
        row.previousBalance,
        row.netAmount,
        row.paidAmount,
        row.carryForward,
        row.processed?.paidAt ? new Date(row.processed.paidAt).toLocaleDateString() : '',
      ])
    )
  }
  const t = report.totals
  lines.push(
    csvLine([
      'TOTAL', '', `${t.processedCount}/${t.employees} processed`, t.baseSalary, t.payouts, '',
      t.deductions, t.bonuses, t.previousBalance, t.netAmount, t.paidAtProcessing, t.owed, '',
    ])
  )
  return lines.join('\r\n')
}

export function employeeYearToCsv(data: EmployeeYear): string {
  const header = [
    'Month', 'Status', 'Base salary', 'Given during month', 'Deductions', 'Bonus',
    'Owed before', 'Net', 'Paid at processing', 'Owed after', 'Processed on',
  ]
  const lines = [csvLine([`${fullName(data.user)} - ${data.year}`]), csvLine(header)]
  for (const m of data.months) {
    lines.push(
      csvLine([
        m.label,
        m.status === 'PROCESSED' ? 'Processed' : 'Open',
        m.baseSalary,
        m.payoutsTotal,
        m.deductions,
        m.bonuses,
        m.previousBalance,
        m.netAmount,
        m.paidAmount,
        m.carryForward,
        m.processedAt ? new Date(m.processedAt).toLocaleDateString() : '',
      ])
    )
  }
  lines.push(csvLine(['TOTAL', `${data.totals.processedMonths} processed`, '', data.totals.payouts,
    data.totals.deductions, data.totals.bonuses, '', '', data.totals.paidAtProcessing, '', '']))
  return lines.join('\r\n')
}

export function downloadTextFile(filename: string, content: string, type = 'text/csv;charset=utf-8'): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
