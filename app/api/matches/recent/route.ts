import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Match, PlayerProfile } from '@/lib/types'

export async function GET(req: Request) {
  const supabase = await createClient()

  const { searchParams } = new URL(req.url)
  const limit = Number(searchParams.get('limit') || '5')

  const { data } = await supabase
    .from('matches')
    .select('id, sport_id, player1_id, player2_id, winner_id, status, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!data) return NextResponse.json([], { status: 200 })

  const matches = data as Match[]
  const ids = Array.from(new Set(matches.flatMap((m) => [m.player1_id, m.player2_id].filter(Boolean)))) as string[]

  const profilesMap: Record<string, Partial<PlayerProfile>> = {}
  if (ids.length) {
    const { data: profiles } = await supabase
      .from('player_profiles_view')
      .select('id, full_name, avatar_url')
      .in('id', ids)
    ;(profiles || []).forEach((p: any) => { profilesMap[p.id] = p })
  }

  const finalStatuses = ['CONFIRMED', 'PROCESSED']

  const out = matches.map((m) => ({
    id: m.id,
    sport_id: m.sport_id,
    status: m.status,
    created_at: m.created_at,
    player1: m.player1_id ? { id: m.player1_id, full_name: profilesMap[m.player1_id]?.full_name, avatar_url: profilesMap[m.player1_id]?.avatar_url } : null,
    player2: m.player2_id ? { id: m.player2_id, full_name: profilesMap[m.player2_id]?.full_name, avatar_url: profilesMap[m.player2_id]?.avatar_url } : null,
    winner_id: m.winner_id,
    result: finalStatuses.includes(m.status) ? (m.winner_id ? m.winner_id : null) : null,
  }))

  return NextResponse.json(out)
}
