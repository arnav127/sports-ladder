
'use client'

import MatchHistory from './MatchHistory'
import PendingChallenges from './PendingChallenges'
import RatingHistory from './RatingHistory'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PlayerProfileExtended } from '@/lib/types'

export default function PlayerProfile({ player }: { player: PlayerProfileExtended }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={player.avatar_url} alt={player.full_name ?? ''} />
          <AvatarFallback>{(player.full_name ?? player.user_email ?? '').toString()[0]?.toUpperCase() ?? 'U'}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <CardTitle>{player.full_name ?? player.user_email}</CardTitle>
          <CardDescription>{player.sport_name}</CardDescription>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{player.rating}</div>
          <div className="text-sm text-muted-foreground">
            Rank: <Badge variant="secondary">{player.rankInfo?.rank ?? '—'}</Badge> / {player.rankInfo?.total ?? '—'}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-3 md:col-span-2">
          <h4 className="font-semibold">Lifetime</h4>
          <p className="text-sm text-muted-foreground">Matches: {player.stats?.total ?? 0}</p>
          <p className="text-sm text-muted-foreground">
            Wins: {player.stats?.wins ?? 0} • Losses: {player.stats?.losses ?? 0}
          </p>
          {player.stats?.winRate != null && <p className="text-sm text-muted-foreground">Win rate: {player.stats.winRate}%</p>}
          <div className="space-y-2">
            <h4 className="font-semibold">Quick actions</h4>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <a href={`/ladder?sport=${player.sport_id}`}>View ladder</a>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <a href={`/ladder?sport=${player.sport_id}&profile=${player.id}`}>View my position</a>
              </Button>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <MatchHistory matches={player.recentMatches} />
        </div>
        <div className="space-y-4 md:col-span-3">
          <PendingChallenges challenges={player.pendingChallenges} currentUserIds={[player.id]} />
        </div>
        <div className="space-y-6 md:col-span-3">
          <RatingHistory ratingHistory={player.ratingHistory} />
        </div>
      </CardContent>
    </Card>
  )
}
