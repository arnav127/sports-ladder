"use client"
import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import { RankedPlayerProfile, Sport } from '@/lib/types'
import { User } from '@supabase/supabase-js'

type Props = {
  player: RankedPlayerProfile
  rank: number
  isChallengable: boolean
  submittingChallenge: string | null
  handleChallenge: (opponentProfileId: string) => void
  selectedSport: Sport | null
  user: User
  recentMatches?: any[]
}

const RankingsTableRow = React.forwardRef<HTMLTableRowElement, Props>(
  ({ player, rank, isChallengable, submittingChallenge, handleChallenge, selectedSport, user, recentMatches }, ref) => {
    const recent = recentMatches ?? []

    return (
      <TableRow ref={ref} className={isChallengable ? 'bg-red-50 dark:bg-red-950 dark:hover:bg-red-700/30' : ''}>
        <TableCell className={isChallengable ? 'bg-red-50/50 dark:bg-red-950/50 dark:hover:bg-red-700/30' : ''}>
          <Badge variant={rank <= 10 ? 'default' : 'secondary'} className={isChallengable ? 'bg-red-400 hover:bg-red-400/80 dark:bg-red-800 dark:hover:bg-red-800/50' : ''}>{rank}</Badge>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={player.avatar_url} />
              <AvatarFallback>
                {(player.full_name ?? player.user_email ?? player.user_id ?? '')
                  .toString()[0]
                  ?.toUpperCase() ?? 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="font-medium flex items-center gap-3">
              <div>{player.full_name ?? player.user_email ?? `Player ${rank}`}</div>
              <div className="flex items-center gap-1">
                {recent.map((m, idx) => {
                  if (m.result === 'win') return <span key={`r-${player.id}-${idx}`} className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white text-xs">✓</span>
                  if (m.result === 'loss') return <span key={`r-${player.id}-${idx}`} className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs">✕</span>
                  return <span key={`r-${player.id}-${idx}`} className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-300 text-gray-600 text-xs">•</span>
                })}
                {Array.from({ length: Math.max(0, 3 - recent.length) }).map((_, i) => (
                  <span key={`e-${player.id}-${i}`} className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 text-gray-400 text-xs">•</span>
                ))}
              </div>
            </div>
          </div>
        </TableCell>
        <TableCell className="text-right font-bold">{player.rating}</TableCell>
        <TableCell className="text-right">{player.matches_played ?? 0}</TableCell>
        <TableCell className="text-right">
          {selectedSport && user && isChallengable ? (
            <Button
              size="sm"
              variant="destructive"
              className='font-bold'
              onClick={() => {
                const name = player.full_name ?? 'this player'
                if (!window.confirm(`Challenge ${name}? Are you sure you want to send this challenge?`)) return
                handleChallenge(player.id)
              }}
              disabled={submittingChallenge != null}
            >
              {submittingChallenge === player.id ? 'Challenging…' : 'Challenge'}
            </Button>
          ) : null}
        </TableCell>
      </TableRow>
    )
  }
)

RankingsTableRow.displayName = 'RankingsTableRow'

export default RankingsTableRow
