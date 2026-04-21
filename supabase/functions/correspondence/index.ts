import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  sendEmail, baseTemplate,
  h1, h2, p, button, bookRow, divider, badge
} from '../_shared/email.ts'

const PROMPT_TYPE_LABELS: Record<string, string> = {
  check_in:            'A note from the library',
  discussion_question: 'Something to think about',
  fun_fact:            'Did you know?',
  author_note:         'About the author',
  custom:              'A note for you',
}

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
    const { correspondenceId } = await req.json()

    if (!correspondenceId) {
      return new Response(JSON.stringify({ error: 'correspondenceId required' }), { status: 400 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const siteUrl = Deno.env.get('SITE_URL') || 'https://thereadingroom.netlify.app'

    // Fetch correspondence with member and book info
    const { data: corr, error } = await supabase
      .from('correspondences')
      .select(`
        *,
        members (id, full_name, email, membership_number),
        books   (id, title, author, cover_url, genre)
      `)
      .eq('id', correspondenceId)
      .single()

    if (error || !corr) {
      return new Response(JSON.stringify({ error: 'Correspondence not found' }), { status: 404 })
    }

    if (corr.sent) {
      return new Response(JSON.stringify({ error: 'Already sent' }), { status: 400 })
    }

    const member    = corr.members
    const book      = corr.books
    const firstName = member.full_name.split(' ')[0]
    const typeLabel = PROMPT_TYPE_LABELS[corr.prompt_type] || 'A note for you'

    // Format content — supports double newlines as paragraph breaks
    const contentHtml = corr.content
      .split('\n\n')
      .filter((s: string) => s.trim())
      .map((s: string) => p(s.replace(/\n/g, '<br/>')))
      .join('')

    const subject = `${typeLabel} — ${book.title}`

    const html = baseTemplate({
      title: subject,
      preheader: `${typeLabel} about "${book.title}" by ${book.author}`,
      body: `
        ${h1(`Hi ${firstName},`)}
        ${p(`Here's something from us about the book you're reading.`)}

        ${bookRow(book.title, book.author,
          `<br/><span style="font-size:11px;font-family:sans-serif;color:#c9a84c;text-transform:uppercase;letter-spacing:0.08em;">${book.genre || ''}</span>`
        )}

        ${divider()}

        ${badge(typeLabel, 'default')}
        <br/><br/>
        ${contentHtml}

        ${divider()}
        ${p('We hope you\'re enjoying the book. See you in the reading room.', true)}
        ${button('Visit my library', `${siteUrl}/member/reading`)}
      `
    })

    await sendEmail({
      to: member.email,
      subject,
      html,
    })

    // Mark correspondence as sent
    await supabase
      .from('correspondences')
      .update({ sent: true })
      .eq('id', correspondenceId)

    // Log in notifications
    await supabase.from('notifications').insert({
      member_id: member.id,
      type: 'custom',
      subject,
      body: corr.content.substring(0, 500),
      sent: true,
      sent_at: new Date().toISOString(),
    })

    return new Response(JSON.stringify({ success: true, sentTo: member.email }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })

  } catch (err) {
    console.error('correspondence error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
