
'use client'

import LadderListItem from './LadderListItem'
import { Card } from '@/components/ui/card'

export default function LadderList({
  sports,
  topLists,
  challengeLists,
  loadingLists,
  submitting,
  handleChallenge,
}: {
  sports: any[]
  topLists: Record<string, any[]>
  challengeLists: Record<string, any[]>
  loadingLists: boolean
  submitting: boolean
  handleChallenge: (sportId: string, opponentProfileId: string) => void
}) {
  return (
    <div className="space-y-6">
      {sports.map(s => (
        <Card key={s.id} className="bg-card hover:bg-muted transition-colors shadow-lg">
          <LadderListItem
            sport={s}
            topList={topLists[s.id] || []}
            challengeList={challengeLists[s.id] || []}
            loadingLists={loadingLists}
            submitting={submitting}
            handleChallenge={handleChallenge}
          />
        </Card>
      ))}
    </div>
  )
}
