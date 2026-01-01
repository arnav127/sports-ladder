import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MatchHistoryItem } from '@/lib/types'

export default async function MatchHistoryPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('matches')
    .select('id, sport_id, player1_id, player2_id, winner_id, status, created_at, sports(id, name)')
    .order('created_at', { ascending: false })
    .limit(100)

  // include sport name from the joined `sports` relation
  const allMatches = ((data || []) as any[]).map((m) => ({
    ...m,
    sport_name: (m.sports && (m.sports as any).name) || null,
  })) as MatchHistoryItem[]

  // separate pending (to be played) from processed matches
  const pending = allMatches.filter((m) => m.status === 'PENDING')
  const finalStatuses = ['CONFIRMED', 'PROCESSED']
  const processed = allMatches.filter((m) => finalStatuses.includes(m.status))

  const ids = Array.from(new Set(allMatches.flatMap((m) => [m.player1_id, m.player2_id].filter(Boolean)))) as string[]
  const profilesMap: Record<string, any> = {}
  if (ids.length) {
    const { data: profiles } = await supabase.from('player_profiles_view').select('id, full_name').in('id', ids)
    ;(profiles || []).forEach((p: any) => { profilesMap[p.id] = p })
  }

  // sport names are embedded on each match as `sport_name`

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pending Matches (to be played)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pending.length === 0 && <p className="text-sm text-muted-foreground">No pending matches.</p>}
            {pending.map((m) => (
              <div key={m.id} className="p-3 border rounded">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold">{profilesMap[m.player1_id]?.full_name ?? 'Player 1'} vs {profilesMap[m.player2_id]?.full_name ?? 'Player 2'}</div>
                    <div className="text-sm text-muted-foreground">{m.sport_name ?? 'Sport'} • {new Date(m.created_at).toLocaleString()}</div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">No actions from this page</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Match History (processed)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {processed.length === 0 && <p className="text-sm text-muted-foreground">No processed matches found.</p>}
            {processed.map((m) => (
              <div key={m.id} className="p-3 border rounded">
                <div className="flex justify-between items-center">
                  <div>
                    <Link href={`/matches/${m.id}`} className="font-semibold">{profilesMap[m.player1_id]?.full_name ?? 'Player 1'} vs {profilesMap[m.player2_id]?.full_name ?? 'Player 2'}</Link>
                    <div className="text-sm text-muted-foreground">{m.sport_name ?? 'Sport'} • {new Date(m.created_at).toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    {m.winner_id ? <span>Winner: {profilesMap[m.winner_id]?.full_name ?? m.winner_id}</span> : <span className="text-sm text-muted-foreground">No result</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
