import { NextRequest, NextResponse } from 'next/server'
import { inngest } from '@/lib/inngest/client'
import { createClient } from '@/lib/supabase/server'


export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')
  
  return new NextResponse(
    `<html>
      <head><title>Confirm Action</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f4f4f5;">
        <div style="background: white; padding: 2rem; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; max-width: 400px; width: 90%;">
          <h1 style="margin-top: 0; font-size: 1.5rem; color: #18181b;">Confirm Action</h1>
          <p style="color: #52525b; margin-bottom: 1.5rem;">Are you sure you want to <strong>${action}</strong> this challenge?</p>
          <form method="POST">
            <button type="submit" style="background: #18181b; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.375rem; font-weight: 500; cursor: pointer; width: 100%;">Yes, ${action}</button>
          </form>
        </div>
      </body>
    </html>`,
    { headers: { 'Content-Type': 'text/html' } }
  )
}

export async function POST(req: NextRequest, { params }: any) {
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

  // check match is in a state to accept challenge action
  if (match.status !== 'CHALLENGED') {
    return NextResponse.json({ error: `Cannot submit result for match in status ${match.status}` }, { status: 400 })
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
    return NextResponse.redirect(origin, { status: 303 })
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
    return NextResponse.redirect(origin, { status: 303 })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
