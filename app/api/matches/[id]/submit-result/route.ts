import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { inngest } from '@/lib/inngest/client'

async function handleResultSubmission(
  id: string,
  winner_profile_id: string,
  token: string | null,
  reported_by: string | null
) {
  // recorded reporter defaults to the winner if not provided (useful for token-based submissions)
  const reporter = reported_by ?? winner_profile_id

  const supabase = await createClient()
  const matchRes = await supabase.from('matches').select('*').eq('id', id).limit(1).single()
  if (!matchRes.data) return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  const match = matchRes.data as any

  if (token) {
    // If a token is provided, it must match the match's action_token
    if (match.action_token !== token) return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
  } else {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // validate reporter is one of the match participants
  if (![match.player1_id, match.player2_id].includes(reporter)) {
    return NextResponse.json({ error: 'Invalid reporter' }, { status: 400 })
  }

  // update match to PROCESSING and record tentative winner in `winner_id` and who reported it
  const { error } = await supabase.from('matches').update({ status: 'PROCESSING', winner_id: winner_profile_id, reported_by: reporter }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Trigger Inngest event for email notification
  await inngest.send({
    name: 'match.result',
    data: { matchId: match.id },
  })

  return NextResponse.json({ ok: true })
}

export async function GET(req: Request, { params }: any) {
  // await the params object in case it's a Promise (Next.js App Router)
  const { id } = (await params) as { id: string }

  const { searchParams } = new URL(req.url)
  const winner_profile_id = searchParams.get('winner_profile_id')
  const token = searchParams.get('token')
  const reported_by_param = searchParams.get('reported_by')

  if (!winner_profile_id) return NextResponse.json({ error: 'Missing winner_profile_id' }, { status: 400 })
  
  return handleResultSubmission(id, winner_profile_id, token, reported_by_param)
}

export async function POST(req: Request, { params }: any) {
  // await the params object in case it's a Promise (Next.js App Router)
  const { id } = (await params) as { id: string }

  const body = await req.json()
  const { winner_profile_id, token, reported_by } = body
  if (!winner_profile_id) return NextResponse.json({ error: 'Missing winner_profile_id' }, { status: 400 })

  return handleResultSubmission(id, winner_profile_id, token, reported_by)
}
