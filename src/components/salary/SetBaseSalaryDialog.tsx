import React, { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material'
import type { User } from '@/services/userApi'
import { fullName } from '@/utils/salaryReport'

export interface SetBaseSalaryDialogProps {
  open: boolean
  onClose: () => void
  users: User[]
  /** Pre-selected employee (editing an existing base salary). */
  initial: { userId: string; baseSalary: number; notes?: string | null } | null
  submitting: boolean
  onSubmit: (data: { userId: string; baseSalary: number; notes?: string }) => void
}

export const SetBaseSalaryDialog: React.FC<SetBaseSalaryDialogProps> = ({
  open,
  onClose,
  users,
  initial,
  submitting,
  onSubmit,
}) => {
  const [userId, setUserId] = useState('')
  const [baseSalary, setBaseSalary] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (open) {
      setUserId(initial?.userId ?? '')
      setBaseSalary(initial && initial.baseSalary ? String(initial.baseSalary) : '')
      setNotes(initial?.notes ?? '')
    }
  }, [open, initial])

  const options = useMemo(
    () => users.filter(u => u.isActive).sort((a, b) => fullName(a).localeCompare(fullName(b))),
    [users]
  )

  const value = parseFloat(baseSalary)
  const canSubmit = !!userId && Number.isFinite(value) && value >= 0 && !submitting

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{initial ? 'Edit base salary' : 'Set base salary'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormControl fullWidth disabled={!!initial}>
            <InputLabel id="base-salary-employee">Employee</InputLabel>
            <Select
              labelId="base-salary-employee"
              label="Employee"
              value={userId}
              onChange={e => setUserId(String(e.target.value))}
            >
              {options.map(u => (
                <MenuItem key={u.id} value={u.id}>{fullName(u)} ({u.role})</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Monthly base salary"
            type="number"
            inputProps={{ min: 0, step: '0.01', inputMode: 'decimal' }}
            value={baseSalary}
            onChange={e => setBaseSalary(e.target.value)}
            fullWidth
            autoFocus
          />
          <TextField
            label="Notes (optional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!canSubmit}
          onClick={() => onSubmit({ userId, baseSalary: value, notes: notes.trim() || undefined })}
        >
          {submitting ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SetBaseSalaryDialog
