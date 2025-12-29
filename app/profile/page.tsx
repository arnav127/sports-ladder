import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import UserProfile from '@/components/profile/UserProfile'
import * as helpers from '@/lib/supabase/supabaseHelpers'
import { PlayerProfile, PlayerProfileExtended, Sport } from '@/lib/types'

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="text-center py-24">
        <h2 className="text-2xl font-bold mb-2">Please sign in</h2>
        <p className="mb-4">You must sign in with Google to view your profile.</p>
        <Link href="/login" className="inline-block bg-blue-600 text-white px-4 py-2 rounded">
          Sign in
        </Link>
      </div>
    )
  }

  const [{ data: profiles }, { data: sports }] = await Promise.all([
    supabase.from('player_profiles_view').select('id, sport_id, rating, matches_played, full_name, avatar_url').eq('user_id', user.id).order('rating', { ascending: false }),
    supabase.from('sports').select('id, name'),
  ])

  const sportMap = ((sports as Sport[]) || []).reduce((acc, s) => ({ ...acc, [s.id]: s.name }), {} as Record<string, string>)
  const profileRows = ((profiles as PlayerProfile[]) || []).map((p) => ({ ...p, sport_name: sportMap[p.sport_id] ?? p.sport_id }))

  const myPlayers = await Promise.all(
    profileRows.map(async (p): Promise<PlayerProfileExtended> => {
      const [stats, matches, rankInfo, pendingChallenges, ratingHistory] = await Promise.all([
        helpers.getProfileStats(p.id),
        helpers.getMatchesForProfile(p.id, 5),
        helpers.getRankForProfile(p.id, p.sport_id),
        helpers.getPendingChallengesForProfile(p.id),
        helpers.getRatingHistory(p.id),
      ])
      return { ...p, stats, recentMatches: matches, rankInfo, pendingChallenges, ratingHistory }
    })
  )

  return <UserProfile user={user} myPlayers={myPlayers} />
}
