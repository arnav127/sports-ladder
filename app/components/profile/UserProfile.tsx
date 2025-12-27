
'use client'

import PlayerProfile from './PlayerProfile'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar'

export default function UserProfile({ user, myPlayers }: { user: any; myPlayers: any[] }) {
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={user.user_metadata.avatar_url} alt="avatar" />
          <AvatarFallback>{user.email?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="overflow-hidden">
          <CardTitle className="text-3xl truncate">{user.email}</CardTitle>
          <CardDescription>Member ID: {user.id}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <h3 className="text-xl font-semibold mb-4">Your Player Profiles</h3>
        {myPlayers.length === 0 ? (
          <p className="text-muted-foreground">You don&apost have any player profiles yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {myPlayers.map((p: any) => (
              <div key={p.id} className="flex-1 min-w-full md:min-w-[500px]">
                <PlayerProfile player={p} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
