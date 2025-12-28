
'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'

export default function LadderListItem({
  sport,
  topList,
  challengeList,
  loadingLists,
  submitting,
  handleChallenge,
}: {
  sport: any
  topList: any[]
  challengeList: any[]
  loadingLists: boolean
  submitting: boolean
  handleChallenge: (sportId: string, opponentProfileId: string) => void
}) {
  return (
    <>
      <CardHeader>
        <CardTitle className="flex items-center justify-between scroll-m-20 text-3xl font-semibold tracking-tight">
          <span>{sport.name}</span>
          <Button asChild variant="outline" size="sm" className='scroll-m-20 text-lg font-semibold tracking-tight'>
            <a href={`/ladder?sport=${sport.id}`}>View ladder</a>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <h3 className="leading-7 [&:not(:first-child)]:mt-6">Top 5 Players</h3>
        <Table>
          <TableBody>
            {(topList || []).map((p: any) => (
              <TableRow key={p.id} className="border-0">
                <TableCell className="p-2">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={p.avatar_url ?? p.user_metadata?.avatar_url} />
                      <AvatarFallback>
                        {(p.full_name ?? p.user_metadata?.full_name ?? p.user_email ?? '').toString()[0] ?? 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-lg">{p.full_name ?? p.user_metadata?.full_name ?? p.user_email}</p>
                      <p className="text-md text-muted-foreground">Rating: {p.rating}</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Separator className="my-4" />
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2 text-muted-foreground">Players you can challenge</h3>
          {loadingLists ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : challengeList && challengeList.length > 0 ? (
            <Table>
              <TableBody>
                {challengeList.map((p: any) => (
                  <TableRow key={p.id} className="border-0">
                    <TableCell className="p-2">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={p.avatar_url ?? p.user_metadata?.avatar_url} />
                          <AvatarFallback>
                            {(p.full_name ?? p.user_metadata?.full_name ?? p.user_email ?? '').toString()[0] ?? 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-lg">{p.full_name ?? p.user_metadata?.full_name ?? p.user_email}</p>
                          <p className="text-md text-muted-foreground">
                            Rank: {p.rank} • Rating: {p.rating}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="default"
                        className='shadow-sm font-bold'
                        onClick={() => {
                          const name = p.full_name ?? p.user_metadata?.full_name ?? 'this player'
                          if (!window.confirm(`Challenge ${name}? Are you sure you want to send this challenge?`)) return
                          handleChallenge(sport.id, p.id)
                        }}
                        disabled={submitting}
                      >
                        Challenge
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              No challengable players (join and participate to see challengable range).
            </p>
          )}
        </div>
      </CardContent>
    </>
  )
}
