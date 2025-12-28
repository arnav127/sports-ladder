import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { inngest } from '@/lib/inngest/client'

export async function GET(req: Request, { params }: any) {
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

    return NextResponse.redirect(`${origin}/?message=verified`)
  } else {
    // opponent rejected the reported result: mark disputed and clear tentative winner and reporter
    const { error } = await supabase.from('matches').update({ status: 'PENDING', winner_id: null, reported_by: null }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    // Trigger Inngest event for email notification
    await inngest.send({
      name: 'match.verify',
      data: { matchId: match.id, action: 'dispute' },
    })
    return NextResponse.redirect(`${origin}/?message=disputed`)
  }
}
