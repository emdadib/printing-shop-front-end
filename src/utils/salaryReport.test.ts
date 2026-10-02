import { describe, it, expect } from 'vitest';
import { csvCell, describeNet, isPeriodUnfinished, monthReportToCsv } from './salaryReport';
import type { MonthReport } from '@/services/salaryApi';

describe('describeNet', () => {
  it('says the company pays when there is money left', () => {
    expect(describeNet({ status: 'OPEN', paidAmount: 1500, carryForward: 0 })).toEqual({
      tone: 'pay', amount: 1500, label: 'To pay at processing',
    });
    expect(describeNet({ status: 'PROCESSED', paidAmount: 1500, carryForward: 0 }).label).toBe('Paid at processing');
  });

  it('says the employee owes when payouts exceeded the salary', () => {
    expect(describeNet({ status: 'OPEN', paidAmount: 0, carryForward: 300 })).toEqual({
      tone: 'owe', amount: 300, label: 'Would owe the company',
    });
    expect(describeNet({ status: 'PROCESSED', paidAmount: 0, carryForward: 300 }).label).toBe('Owes the company');
  });

  it('marks a skipped month and keeps earlier debt visible', () => {
    expect(describeNet({ status: 'SKIPPED', paidAmount: 0, carryForward: 0 }).label).toBe('Skipped · no salary this month');
    expect(describeNet({ status: 'SKIPPED', paidAmount: 0, carryForward: 400 })).toEqual({
      tone: 'owe', amount: 400, label: 'Skipped · still owes',
    });
  });

  it('is even when nothing is left either way', () => {
    expect(describeNet({ status: 'OPEN', paidAmount: 0, carryForward: 0 }).tone).toBe('even');
  });
});

describe('isPeriodUnfinished', () => {
  const now = new Date(2026, 8, 15); // 15 Sep 2026
  it('flags the running month and the future, not the past', () => {
    expect(isPeriodUnfinished(9, 2026, now)).toBe(true);
    expect(isPeriodUnfinished(10, 2026, now)).toBe(true);
    expect(isPeriodUnfinished(1, 2027, now)).toBe(true);
    expect(isPeriodUnfinished(8, 2026, now)).toBe(false);
    expect(isPeriodUnfinished(12, 2025, now)).toBe(false);
  });
});

describe('CSV export', () => {
  it('quotes cells that contain commas or quotes', () => {
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell('a, b')).toBe('"a, b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell(12.5)).toBe('12.5');
    expect(csvCell(null)).toBe('');
  });

  it('writes one line per employee plus a totals line', () => {
    const report: MonthReport = {
      month: 9,
      year: 2026,
      label: 'September 2026',
      rows: [
        {
          userId: 'u1',
          user: { id: 'u1', firstName: 'Rahim', lastName: 'Uddin', role: 'STAFF' },
          status: 'OPEN',
          hasProfile: true,
          baseSalary: 20000,
          attendance: null,
          deductions: 500,
          bonuses: 0,
          payoutsTotal: 8000,
          payoutsCount: 2,
          pendingPayoutsCount: 0,
          payouts: [],
          previousBalance: 0,
          netAmount: 11500,
          paidAmount: 11500,
          carryForward: 0,
          processed: null,
        },
      ],
      totals: {
        employees: 1, processedCount: 0, openCount: 1, skippedCount: 0, baseSalary: 20000, payouts: 8000, deductions: 500,
        bonuses: 0, previousBalance: 0, netAmount: 11500, toPayAtProcessing: 11500, paidAtProcessing: 0,
        owed: 0, projectedOwed: 0, cashOut: 8000,
      },
    };

    const lines = monthReportToCsv(report).split('\r\n');
    expect(lines[0]).toBe('September 2026 salary');
    expect(lines[1]).toMatch(/^Employee,Role,Status,Base salary,Given during month/);
    expect(lines[2]).toBe('Rahim Uddin,STAFF,Open,20000,8000,2,500,0,0,11500,11500,0,');
    expect(lines[3]).toMatch(/^TOTAL,,0\/1 processed,20000,8000,,500,0,0,11500,0,0,$/);
  });
});
