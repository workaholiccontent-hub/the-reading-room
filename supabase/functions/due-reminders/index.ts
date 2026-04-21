import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  sendEmail, baseTemplate,
  h1, h2, p, button, bookRow, divider, badge
} from '../_shared/email.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const siteUrl = Deno.env.get('SITE_URL') || 'https://thereadingroom.netlify.app'
    const now = new Date()

    // ── 1. Due in exactly 3 days (send reminder) ──────────────────────────
    const threeDaysFromNow = new Date(now)
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
    const reminderDate = threeDaysFromNow.toISOString().split('T')[0] // YYYY-MM-DD

    const { data: dueLoans } = await supabase
      .from('active_loans_view')
      .select('*')
      .gte('days_remaining', 2)
      .lte('days_remaining', 3)

    // ── 2. Overdue (past due date) ────────────────────────────────────────
    const { data: overdueLoans } = await supabase
      .from('active_loans_view')
      .select('*')
      .lt('days_remaining', 0)
      .gte('days_remaining', -1) // only notify on day 1 of being overdue to avoid spam

    const allLoans = [
      ...(dueLoans || []).map(l => ({ ...l, type: 'due_reminder' })),
      ...(overdueLoans || []).map(l => ({ ...l, type: 'overdue' })),
    ]

    if (allLoans.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No reminders needed' }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Group by member so each member gets one email with all their books
    const byMember: Record<string, { member: any, loans: any[] }> = {}
    for (const loan of allLoans) {
      if (!byMember[loan.member_id]) {
        byMember[loan.member_id] = {
          member: { id: loan.member_id, full_name: loan.full_name, email: loan.email },
          loans: []
        }
      }
      byMember[loan.member_id].loans.push(loan)
    }

    let sent = 0
    const errors: string[] = []

    for (const { member, loans } of Object.values(byMember)) {
      try {
        const firstName   = member.full_name.split(' ')[0]
        const hasOverdue  = loans.some(l => l.type === 'overdue')
        const hasDueSoon  = loans.some(l => l.type === 'due_reminder')

        const subject = hasOverdue
          ? `⚠️ Overdue book reminder — please return soon`
          : `📅 Your book is due back in 3 days`

        const intro = hasOverdue
          ? `Hi ${firstName}, you have a book that is now overdue. Please return it as soon as possible so other members can enjoy it.`
          : `Hi ${firstName}, just a friendly reminder that you have a book due back in the next 3 days.`

        const booksHtml = loans.map(loan => {
          const daysAbs   = Math.abs(loan.days_remaining)
          const dueDate   = new Date(loan.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
          const statusBadge = loan.type === 'overdue'
            ? `<br/><span style="font-size:11px;color:#b85c38;font-family:sans-serif;font-weight:500;">⚠ ${daysAbs} day${daysAbs !== 1 ? 's' : ''} overdue</span>`
            : `<br/><span style="font-size:11px;color:#9a7a2e;font-family:sans-serif;font-weight:500;">Due ${dueDate}</span>`
          return bookRow(loan.title, loan.author, statusBadge)
        }).join('')

        const html = baseTemplate({
          title: subject,
          preheader: intro,
          body: `
            ${h1(hasOverdue ? 'Book overdue' : 'Due date reminder')}
            ${p(intro)}
            ${divider()}
            ${booksHtml}
            ${divider()}
            ${p('Head to your member dashboard to see your full loan history and manage your books.')}
            ${button('Go to my library', `${siteUrl}/member/books`)}
            ${hasOverdue ? p('Late returns affect other members who may be waiting. Thank you for returning promptly.', true) : ''}
          `
        })

        await sendEmail({ to: member.email, subject, html })

        // Log notification
        await supabase.from('notifications').insert({
          member_id: member.id,
          type: hasOverdue ? 'overdue' : 'due_reminder',
          subject,
          body: `Reminder sent for: ${loans.map(l => l.title).join(', ')}`,
          sent: true,
          sent_at: new Date().toISOString(),
        })

        sent++
      } catch (err) {
        errors.push(`${member.email}: ${err.message}`)
      }
    }

    return new Response(JSON.stringify({ sent, errors }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })

  } catch (err) {
    console.error('due-reminders error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
