import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Props = { params: { id: string } }

export default async function MatchPage({ params }: Props) {
  const supabase = await createClient()
  const { id } = (await params) as { id: string }

  const matchRes = await supabase.from('matches').select('*').eq('id', id).limit(1).maybeSingle()
  if (!matchRes.data) return <div className="max-w-3xl mx-auto p-6">Match not found</div>
  const match = matchRes.data as any

  // fetch player profiles
  const ids = [match.player1_id, match.player2_id].filter(Boolean)
  let profilesMap: Record<string, any> = {}
  if (ids.length) {
    const { data: profiles } = await supabase
      .from('player_profiles_view')
      .select('id, full_name, avatar_url')
      .in('id', ids)
    ;(profiles || []).forEach((p: any) => { profilesMap[p.id] = p })
  }

  // fetch sport name
  let sportName: string | null = null
  if (match.sport_id) {
    const { data: sport } = await supabase.from('sports').select('id, name').eq('id', match.sport_id).maybeSingle()
    sportName = (sport as any)?.name ?? null
  }

  // determine if the current viewer is an authenticated player in this match
  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user
  let allowedToSubmit = false
  if (user) {
    const { data: userProfiles } = await supabase.from('player_profiles').select('id').eq('user_id', user.id)
    const pids = (userProfiles || []).map((p: any) => p.id)
    if (pids.find((pid: string) => pid === match.player1_id || pid === match.player2_id)) allowedToSubmit = true
  }

  const player1 = match.player1_id ? profilesMap[match.player1_id] ?? { id: match.player1_id } : null
  const player2 = match.player2_id ? profilesMap[match.player2_id] ?? { id: match.player2_id } : null

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Match Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p><strong>Match ID:</strong> {match.id}</p>
            <p><strong>Players:</strong> {player1?.full_name ?? 'Unknown'} vs {player2?.full_name ?? 'Unknown'}</p>
            {sportName && <p><strong>Sport:</strong> {sportName}</p>}
            <p><strong>Status:</strong> {match.status}</p>
            {match.winner_id && <p><strong>Winner:</strong> {profilesMap[match.winner_id]?.full_name ?? match.winner_id}</p>}
            <p className="text-sm text-muted-foreground">Created: {new Date(match.created_at).toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>


      <div>
        <Link href="/">← Back</Link>
      </div>
    </div>
  )
}
