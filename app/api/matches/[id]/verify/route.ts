import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { inngest } from '@/lib/inngest/client'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('verify') === 'yes' ? 'confirm' : 'dispute'

  return new NextResponse(
    `<html>
      <head><title>Verify Result</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f4f4f5;">
        <div style="background: white; padding: 2rem; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; max-width: 400px; width: 90%;">
          <h1 style="margin-top: 0; font-size: 1.5rem; color: #18181b;">Verify Result</h1>
          <p style="color: #52525b; margin-bottom: 1.5rem;">Do you want to <strong>${action}</strong> this result?</p>
          <form method="POST">
            <button type="submit" style="background: #18181b; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.375rem; font-weight: 500; cursor: pointer; width: 100%;">Yes, ${action}</button>
          </form>
        </div>
      </body>
    </html>`,
    { headers: { 'Content-Type': 'text/html' } }
  )
}

export async function POST(req: Request, { params }: any) {
  // await params to support Next.js dynamic API behavior
  const supabase = await createClient()
  const { id } = (await params) as { id: string }
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  const action = searchParams.get('verify') // 'yes' or 'no'

  if (!token || !action) return NextResponse.json({ error: 'Missing token or action' }, { status: 400 })

  const matchRes = await supabase.from('matches').select('*').eq('id', id).limit(1).single()
  if (!matchRes.data) return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  const match = matchRes.data as any

  if (match.action_token !== token) return NextResponse.json({ error: 'Invalid token' }, { status: 403 })

  const origin = process.env.PUBLIC_SITE_URL ?? new URL(req.url).origin

  // check match is in state to accept verification
  if (match.status !== 'PROCESSING') {
    return NextResponse.json({ error: `Cannot verify match in status ${match.status}` }, { status: 400 })
  }

  if (action === 'yes') {
    // Mark match as CONFIRMED — a DB trigger/process will handle ELO and history updates
    const { error } = await supabase.from('matches').update({ status: 'CONFIRMED' }).eq('id', id)
    if (error) {
      console.error('Failed to set match to CONFIRMED:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    // Trigger Inngest event for email notification
    await inngest.send({
      name: 'match.verify',
      data: { matchId: match.id, action: 'confirm' },
    })

    return NextResponse.redirect(origin, { status: 303 })
  } else {
    // opponent rejected the reported result: mark disputed and clear tentative winner and reporter
    const { error } = await supabase.from('matches').update({ status: 'PENDING', winner_id: null, reported_by: null }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    // Trigger Inngest event for email notification
    await inngest.send({
      name: 'match.verify',
      data: { matchId: match.id, action: 'dispute' },
    })
    return NextResponse.redirect(origin, { status: 303 })
  }
}
