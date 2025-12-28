
'use client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import React from 'react'

const RankingsTableRow = React.forwardRef<
  HTMLTableRowElement,
  {
    player: any
    rank: number
    isChallengable: boolean
    submittingChallenge: string | null
    handleChallenge: (opponentProfileId: string) => void
    selectedSport: any
    user: any
  }
>(({ player, rank, isChallengable, submittingChallenge, handleChallenge, selectedSport, user }, ref) => {
  return (
    <TableRow ref={ref} className={isChallengable ? 'bg-red-50 dark:bg-red-950 dark:hover:bg-red-700/30' : ''}>
      <TableCell className={isChallengable ? 'bg-red-50/50 dark:bg-red-950/50 dark:hover:bg-red-700/30' : ''}>
        <Badge variant={rank <= 10 ? 'default' : 'secondary'} className={isChallengable ? 'bg-red-400 hover:bg-red-400/80 dark:bg-red-800 dark:hover:bg-red-800/50' : ''}>{rank}</Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={player.avatar_url ?? player.user_metadata?.avatar_url} />
            <AvatarFallback>
              {(player.full_name ?? player.user_metadata?.full_name ?? player.user_email ?? player.user_id ?? '')
                .toString()[0]
                ?.toUpperCase() ?? 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="font-medium">
            {player.full_name ?? player.user_metadata?.full_name ?? player.user_email ?? `Player ${rank}`}
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
              const name = player.full_name ?? player.user_metadata?.full_name ?? 'this player'
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
})

RankingsTableRow.displayName = 'RankingsTableRow'

export default RankingsTableRow
