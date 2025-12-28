import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { inngest } from '@/lib/inngest/client'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { sportId, challengerProfileId, opponentProfileId, message } = await request.json()

  // 1. Verify the user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Verify the challenger profile belongs to the authenticated user
  const { data: profile } = await supabase
    .from('player_profiles')
    .select('user_id')
    .eq('id', challengerProfileId)
    .single()

  if (!profile || profile.user_id !== user.id) {
    return NextResponse.json({ error: 'You can only challenge on behalf of your own profile' }, { status: 403 })
  }

  if (challengerProfileId === opponentProfileId) {
    return NextResponse.json({ error: 'Cannot challenge yourself' }, { status: 400 })
  }

  // Check for existing active challenges
  const { data: existing } = await supabase
    .from('matches')
    .select('id, status')
    .eq('sport_id', sportId)
    .or(
      `and(player1_id.eq.${challengerProfileId},player2_id.eq.${opponentProfileId}),and(player1_id.eq.${opponentProfileId},player2_id.eq.${challengerProfileId})`
    )
    .in('status', ['CHALLENGED', 'PENDING', 'PROCESSING'])
    .limit(1)

  if (existing && existing.length) {
    return NextResponse.json(
      { error: 'There is already a pending or processing challenge between these players' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('matches')
    .insert({
      sport_id: sportId,
      player1_id: challengerProfileId,
      player2_id: opponentProfileId,
      status: 'CHALLENGED',
      message: message ?? null,
    })
    .select()
    .single()

  if (error) {
    if (error.message && error.message.includes('duplicate key')) {
      return NextResponse.json(
        { error: 'There is already a pending or processing challenge between these players' },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Trigger Inngest event for email notification
  await inngest.send({
    name: 'match.new',
    data: { matchId: data.id },
  })

  return NextResponse.json(data)
}