import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

async function callFunction(name, body) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Function error ${res.status}`)
  return data
}

// Send a welcome email to a newly-approved member
export function useWelcomeEmail() {
  const [loading, setLoading] = useState(false)
  async function sendWelcome(memberId) {
    setLoading(true)
    try {
      await callFunction('welcome-email', { memberId })
      toast.success('Welcome email sent!')
    } catch (err) {
      toast.error(`Failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }
  return { sendWelcome, loading }
}

// Trigger due-date reminders scan (admin)
export function useDueReminders() {
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)
  async function runReminders() {
    setLoading(true)
    try {
      const data = await callFunction('due-reminders', {})
      setResult(data)
      toast.success(`Sent ${data.sent} reminder${data.sent !== 1 ? 's' : ''}`)
    } catch (err) {
      toast.error(`Failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }
  return { runReminders, loading, result }
}

// Send a newsletter / custom email to members
export function useSendEmail() {
  const [loading, setLoading] = useState(false)
  async function sendBroadcast({ type, subject, body, memberIds, buttonText, buttonUrl }) {
    setLoading(true)
    try {
      const data = await callFunction('send-email', {
        type, subject, body, memberIds, buttonText, buttonUrl
      })
      toast.success(`Sent to ${data.sent} of ${data.total} members`)
      return data
    } catch (err) {
      toast.error(`Failed: ${err.message}`)
      return null
    } finally {
      setLoading(false)
    }
  }
  return { sendBroadcast, loading }
}

// Send a single correspondence item
export function useSendCorrespondence() {
  const [loading, setLoading] = useState(false)
  async function sendCorrespondence(correspondenceId) {
    setLoading(true)
    try {
      const data = await callFunction('correspondence', { correspondenceId })
      toast.success(`Sent to ${data.sentTo}`)
      return true
    } catch (err) {
      toast.error(`Failed: ${err.message}`)
      return false
    } finally {
      setLoading(false)
    }
  }
  return { sendCorrespondence, loading }
}
