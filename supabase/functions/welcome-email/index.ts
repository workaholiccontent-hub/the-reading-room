import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  sendEmail, baseTemplate,
  h1, h2, p, button, divider, badge
} from '../_shared/email.ts'

serve(async (req) => {
  // Allow CORS for admin UI calls
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  try {
    const { memberId } = await req.json()

    if (!memberId) {
      return new Response(JSON.stringify({ error: 'memberId required' }), { status: 400 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Fetch member
    const { data: member, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', memberId)
      .single()

    if (error || !member) {
      return new Response(JSON.stringify({ error: 'Member not found' }), { status: 404 })
    }

    const libraryName = Deno.env.get('LIBRARY_NAME') || 'The Reading Room'
    const siteUrl     = Deno.env.get('SITE_URL') || 'https://thereadingroom.netlify.app'
    const firstName   = member.full_name.split(' ')[0]

    const html = baseTemplate({
      title: `Welcome to ${libraryName}`,
      preheader: `Your membership is confirmed, ${firstName}. Here's everything you need to get started.`,
      body: `
        ${h1(`Welcome, ${firstName}!`)}
        ${p(`Your membership to <strong>${libraryName}</strong> is now active. We're so glad you're here.`)}
        ${badge(member.membership_number, 'success')}

        ${divider()}

        ${h2('Your membership at a glance')}
        <table cellpadding="0" cellspacing="0" role="presentation" style="width:100%;margin:16px 0;">
          ${[
            ['Borrow up to', '3 books at a time'],
            ['Lending period', '14 days per book'],
            ['Renewals', 'Reserve from your dashboard'],
            ['Book club', 'Monthly discussions & reviews'],
          ].map(([label, val]) => `
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #e8dfd0;font-size:13px;color:#7a6f68;font-family:sans-serif;width:50%;">${label}</td>
            <td style="padding:8px 0;border-bottom:1px solid #e8dfd0;font-size:14px;color:#1a1612;font-weight:500;font-family:sans-serif;">${val}</td>
          </tr>`).join('')}
        </table>

        ${divider()}

        ${h2('Get started')}
        ${p('Head to the catalogue to browse everything we have. When you find something you like, borrow it straight from the book page.')}
        ${button('Browse the catalogue', `${siteUrl}/catalogue`)}

        ${divider()}
        ${p(`Your membership number is <strong>${member.membership_number}</strong>. Keep this handy.`, true)}
      `
    })

    await sendEmail({
      to: member.email,
      subject: `Welcome to ${libraryName}, ${firstName}! 📚`,
      html,
    })

    // Log the notification
    await supabase.from('notifications').insert({
      member_id: memberId,
      type: 'welcome',
      subject: `Welcome to ${libraryName}!`,
      body: `Welcome email sent to ${member.email}`,
      sent: true,
      sent_at: new Date().toISOString(),
    })

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })

  } catch (err) {
    console.error('welcome-email error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
