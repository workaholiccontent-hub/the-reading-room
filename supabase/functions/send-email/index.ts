import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  sendEmail, baseTemplate,
  h1, p, button, divider
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
    // Validate admin caller
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const {
      type,        // 'newsletter' | 'custom' | 'reservation_ready'
      subject,
      body,        // plain text or HTML body content
      memberIds,   // array of member UUIDs, or 'all' for everyone active
      buttonText,  // optional CTA button text
      buttonUrl,   // optional CTA button URL
    } = await req.json()

    if (!subject || !body) {
      return new Response(JSON.stringify({ error: 'subject and body required' }), { status: 400 })
    }

    const siteUrl = Deno.env.get('SITE_URL') || 'https://thereadingroom.netlify.app'

    // Resolve recipients
    let query = supabase.from('members').select('id, full_name, email').eq('status', 'active')
    if (Array.isArray(memberIds) && memberIds.length > 0) {
      query = query.in('id', memberIds)
    }
    const { data: members, error: membersError } = await query
    if (membersError) throw membersError
    if (!members || members.length === 0) {
      return new Response(JSON.stringify({ error: 'No recipients found' }), { status: 400 })
    }

    // Build HTML from body (supports markdown-ish: double newline = new paragraph)
    const bodyParagraphs = body
      .split('\n\n')
      .filter((s: string) => s.trim())
      .map((s: string) => p(s.replace(/\n/g, '<br/>')))
      .join('')

    const ctaHtml = buttonText && buttonUrl ? button(buttonText, buttonUrl) : ''

    let sent = 0
    const errors: string[] = []

    for (const member of members) {
      try {
        const firstName = member.full_name.split(' ')[0]

        // Personalise salutation for custom/newsletter emails
        const personalised = body.replace(/\{\{name\}\}/g, firstName)
        const personalisedParagraphs = personalised
          .split('\n\n')
          .filter((s: string) => s.trim())
          .map((s: string) => p(s.replace(/\n/g, '<br/>')))
          .join('')

        const html = baseTemplate({
          title: subject,
          preheader: subject,
          body: `
            ${h1(subject)}
            ${personalisedParagraphs}
            ${ctaHtml ? divider() + ctaHtml : ''}
          `
        })

        await sendEmail({ to: member.email, subject, html })

        // Log notification per member
        await supabase.from('notifications').insert({
          member_id: member.id,
          type: type || 'custom',
          subject,
          body: body.substring(0, 500),
          sent: true,
          sent_at: new Date().toISOString(),
        })

        sent++
      } catch (err) {
        errors.push(`${member.email}: ${err.message}`)
        console.error('send error for', member.email, err)
      }
    }

    return new Response(JSON.stringify({ sent, total: members.length, errors }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })

  } catch (err) {
    console.error('send-email error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
