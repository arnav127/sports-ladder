
'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { PendingChallengeItem } from '@/lib/types'

const statusMap: Record<string, string> = {
  PENDING: 'Pending',
  CHALLENGED: 'Challenged',
  PROCESSING: 'Processing',
}

const getMatchStatus = (match: PendingChallengeItem) => {
  if (match.result === 'win') return 'Won'
  if (match.result === 'loss') return 'Lost'
  return statusMap[match.status] || match.status
}

const getBadgeVariant = (status: string) => {
  switch (status) {
    case 'Won':
      return 'default'
    case 'Lost':
      return 'destructive'
    case 'Challenged':
      return 'default'
    default:
      return 'secondary'
  }
}

export default function PendingChallenges({
  challenges,
  currentUserIds,
  onAction = () => window.location.reload(),
}: {
  challenges: PendingChallengeItem[] | undefined
  currentUserIds: string[]
  onAction?: () => void
}) {
  if (!challenges || challenges.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Challenges</CardTitle>
        <CardDescription>Challenges that require your attention.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {challenges.map((c) => {
          const status = getMatchStatus(c)
          const myProfileId = currentUserIds.find(id => id === c.player1_id?.id || id === c.player2_id?.id)

          return (
            <div key={c.id} className="border rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex justify-center">
                <div className="font-semibold text-sm">
                  <Badge variant={getBadgeVariant(status)} className={status === 'Challenged' ? 'bg-blue-500' : 'text-sx'}>
                    {status}
                  </Badge>{' '}
                  • {c.player1_id.full_name} vs {c.player2_id.full_name}
                </div>
                <p className="text-sm text-muted-foreground">{c.message ?? ''}</p>
              </div>
              <div className="flex items-center gap-2">
                {c.status === 'CHALLENGED' && c.player2_id?.id === myProfileId && (
                  <>
                    <Button
                      size="sm"
                      onClick={() =>
                        window.fetch(`/api/matches/${c.id}/action?action=accept&token=${c.action_token}`, { method: 'POST' }).then(() => onAction())
                      }
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        window.fetch(`/api/matches/${c.id}/action?action=reject&token=${c.action_token}`, { method: 'POST' }).then(() => onAction())
                      }
                    >
                      Reject
                    </Button>
                  </>
                )}

                {c.status === 'PENDING' && (
                  <form
                    className="flex items-center gap-2"
                    onSubmit={async e => {
                      e.preventDefault()
                      const form = e.target as HTMLFormElement
                      const data = new FormData(form)
                      const winner = data.get('winner') as string
                      await fetch(`/api/matches/${c.id}/submit-result`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ winner_profile_id: winner, reported_by: myProfileId, token: c.action_token }),
                      })
                      onAction()
                    }}
                  >
                    <Select name="winner">
                      <SelectTrigger>
                        <SelectValue placeholder="Select winner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={c.player1_id.id}>{c.player1_id.full_name ?? 'Player 1'}</SelectItem>
                        <SelectItem value={c.player2_id.id}>{c.player2_id.full_name ?? 'Player 2'}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" type="submit">
                      Submit
                    </Button>
                  </form>
                )}

                {c.status === 'PROCESSING' &&
                  (c.reported_by?.id !== myProfileId ? (
                    <div className="flex items-center gap-2">
                      {c.winner_id === myProfileId ? (
                        <span className="text-green-500 font-bold">Won</span>
                      ) : (
                        <span className="text-red-500 font-bold">Lost</span>
                      )}
                      <Button
                        size="sm"
                        onClick={() =>
                          window.fetch(`/api/matches/${c.id}/verify?verify=yes&token=${c.action_token}`, { method: 'POST' }).then(() => onAction())
                        }
                      >
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          window.fetch(`/api/matches/${c.id}/verify?verify=no&token=${c.action_token}`, { method: 'POST' }).then(() => onAction())
                        }
                      >
                        Dispute
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Awaiting verification</p>
                  ))}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
