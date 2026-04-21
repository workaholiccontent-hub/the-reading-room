import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  sendEmail, baseTemplate,
  h1, p, button, bookRow, divider, badge
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

    const siteUrl     = Deno.env.get('SITE_URL')     || 'https://thereadingroom.netlify.app'
    const libraryName = Deno.env.get('LIBRARY_NAME') || 'The Reading Room'

    // Fetch all pending (not yet notified) waitlist items
    const { data: pending } = await supabase
      .from('pending_waitlist_view')
      .select('*')
      .eq('status', 'pending')

    if (!pending || pending.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: 'No pending waitlist notifications' }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    let sent = 0
    const errors: string[] = []

    for (const item of pending) {
      try {
        const firstName  = item.full_name.split(' ')[0]
        const expiryDate = new Date(item.expires_at).toLocaleDateString('en-GB', {
          weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
        })

        const subject = `📚 Your reserved book is available — ${item.title}`

        const html = baseTemplate({
          title: subject,
          preheader: `Good news, ${firstName}! "${item.title}" is now available for you to borrow.`,
          body: `
            ${h1(`Great news, ${firstName}!`)}
            ${p(`A book you've been waiting for has just become available. You're next in line — head to the library to borrow it.`)}

            ${bookRow(item.title, item.author,
              `<br/><span style="font-size:11px;font-family:sans-serif;color:#5a7a6a;font-weight:500;">Now available · ${item.available_copies} cop${item.available_copies === 1 ? 'y' : 'ies'} ready</span>`
            )}

            ${divider()}

            ${badge('Act quickly', 'warning')}
            <br/><br/>
            ${p(`This reservation will expire on <strong>${expiryDate}</strong>. If you don't borrow the book by then, it will be offered to the next person in the queue.`)}

            ${button('Borrow now', `${siteUrl}/books/${item.book_id}`)}

            ${divider()}
            ${p(`Not interested any more? You can cancel your reservation from your member dashboard.`, true)}
          `
        })

        await sendEmail({ to: item.email, subject, html })

        // Mark as notified
        await supabase
          .from('waitlist_notifications')
          .update({ status: 'notified', notified_at: new Date().toISOString() })
          .eq('id', item.id)

        // Also log in notifications table
        await supabase.from('notifications').insert({
          member_id: item.member_id,
          type:      'reservation_ready',
          subject,
          body:      `Waitlist notification sent for: ${item.title}`,
          sent:      true,
          sent_at:   new Date().toISOString(),
        })

        sent++
      } catch (err) {
        errors.push(`${item.email}: ${err.message}`)
        console.error('waitlist notify error for', item.email, err)
      }
    }

    return new Response(JSON.stringify({ sent, errors }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })

  } catch (err) {
    console.error('waitlist-notify error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
