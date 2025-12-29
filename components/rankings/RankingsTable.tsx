
'use client'

import { RankedPlayerProfile, Sport } from '@/lib/types'
import RankingsTableRow from './RankingsTableRow'
import { Table, TableBody, TableCaption, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { User } from '@supabase/supabase-js'

export default function RankingsTable({
  players,
  ranks,
  challengables,
  submittingChallenge,
  handleChallenge,
  selectedSport,
  user,
  playerRefs,
}: {
  players: RankedPlayerProfile[]
  ranks: number[]
  challengables: Set<string>
  submittingChallenge: string | null
  handleChallenge: (opponentProfileId: string) => void
  selectedSport: Sport | null
  user: User
  playerRefs: React.RefObject<HTMLTableRowElement>[]
}) {
  return (
    <Table>
      <TableCaption>{players.length === 0 ? 'No players yet.' : 'A list of players in the ladder.'}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className='font-bold'>Rank</TableHead>
          <TableHead className='font-bold'>Player</TableHead>
          <TableHead className="text-right font-bold">Rating</TableHead>
          <TableHead className="text-right font-bold">Matches</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {players.map((p, i) => (
          <RankingsTableRow
            key={p.id}
            ref={playerRefs[i]}
            player={p}
            rank={ranks[i]}
            isChallengable={challengables.has(p.id)}
            submittingChallenge={submittingChallenge}
            handleChallenge={handleChallenge}
            selectedSport={selectedSport}
            user={user}
          />
        ))}
      </TableBody>
    </Table>
  )
}
