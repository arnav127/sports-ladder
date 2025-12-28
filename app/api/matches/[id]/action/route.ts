import { NextRequest, NextResponse } from 'next/server'
import { inngest } from '@/lib/inngest/client'
import { createClient } from '@/lib/supabase/server'


export async function GET(req: NextRequest, { params }: any) {
    const supabase = await createClient()
  const { id } = (await params) as { id: string }
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')
  const token = searchParams.get('token')

  if (!action) return NextResponse.json({ error: 'Missing action' }, { status: 400 })

  // validate token if provided
  const matchRes = await supabase.from('matches').select('*').eq('id', id).limit(1).single()
  if (!matchRes.data) return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  const match = matchRes.data as any

  if (token) {
    if (match.action_token !== token) return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
  } else {
    // token not provided, require authentication (developers should add auth check here)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  if (action === 'accept') {
    // set status to PENDING (accepted) and return the updated row to verify success
    const { data: updated, error } = await supabase.from('matches').update({ status: 'PENDING' }).eq('id', id).select().maybeSingle()
    if (error) {
      console.error('Failed to update match status to PENDING:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!updated) return NextResponse.json({ error: 'No rows updated; match not found or not permitted' }, { status: 500 })
    // Trigger Inngest event for email notification
    await inngest.send({
      name: 'match.action',
      data: { matchId: updated.id, action: 'accept' },
    })
    const origin = process.env.PUBLIC_SITE_URL ?? new URL(req.url).origin
    return NextResponse.redirect(`${origin}/?message=accepted`)
  }

  if (action === 'reject') {
    const { data: updated, error } = await supabase.from('matches').update({ status: 'CANCELLED' }).eq('id', id).select().maybeSingle()
    if (error) {
      console.error('Failed to update match status to CANCELLED:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!updated) return NextResponse.json({ error: 'No rows updated; match not found or not permitted' }, { status: 500 })
    // Trigger Inngest event for email notification
    await inngest.send({
      name: 'match.action',
      data: { matchId: updated.id, action: 'reject' },
    })
    const origin = process.env.PUBLIC_SITE_URL ?? new URL(req.url).origin
    return NextResponse.redirect(`${origin}/?message=rejected`)
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
