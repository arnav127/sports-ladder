
'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { MatchHistoryItem } from '@/lib/types'

const statusMap: Record<string, string> = {
  PENDING: 'Pending',
  CHALLENGED: 'Challenged',
}

const getMatchStatus = (match: MatchHistoryItem) => {
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
    default:
      return 'secondary'
  }
}

export default function MatchHistory({ matches }: { matches: MatchHistoryItem[] | undefined }) {
  return (
    <div>
      <h4 className="font-semibold mb-2">Recent Matches</h4>
      {matches && matches.length > 0 ? (
        <ul className="space-y-2">
          {matches.map((m) => {
            const status = getMatchStatus(m)
            return (
              <li key={m.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={m.opponent?.avatar_url} />
                    <AvatarFallback>{(m.opponent?.full_name ?? '').toString()[0]?.toUpperCase() ?? 'U'}</AvatarFallback>
                  </Avatar>
                  <div>{m.opponent?.full_name ?? 'Unknown'}</div>
                </div>

                <div className="ml-3">
                  <Badge variant={getBadgeVariant(status)} className={status === 'Won' ? 'bg-green-500' : ''}>
                    {status}
                  </Badge>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No recent matches</p>
      )}
    </div>
  )
}
