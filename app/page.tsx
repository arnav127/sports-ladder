
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import useUser from '@/lib/hooks/useUser'
import useLadders from '@/lib/hooks/useLadders'
import LadderList from '@/components/ladders/LadderList'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import PendingChallenges from '@/components/profile/PendingChallenges'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function Home() {
  const { user, loading } = useUser()
  const { sports, getPlayersForSport, getUserProfileForSport, createChallenge, getPendingChallengesForUser } = useLadders()
  const [sportId, setSportId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [topLists, setTopLists] = useState<Record<string, any[]>>({})
  const [challengeLists, setChallengeLists] = useState<Record<string, any[]>>({})
  const [loadingLists, setLoadingLists] = useState(false)
  const [pendingChallenges, setPendingChallenges] = useState<any[]>([])
  const [userProfileIds, setUserProfileIds] = useState<string[]>([])
  const [unjoinedSports, setUnjoinedSports] = useState<any[]>([])
  const router = useRouter()
  const userId = user?.id

  useEffect(() => {
    if (sports.length > 0 && !sportId) setSportId(sports[0].id)
  }, [sports, sportId])

  // fetch top 5 and challengable lists for each sport
  useEffect(() => {
    async function loadLists() {
      setLoadingLists(true)
      const tops: Record<string, any[]> = {}
      const challengables: Record<string, any[]> = {}

      for (const s of sports) {
        const players = await getPlayersForSport(s.id) // fetch full list
        tops[s.id] = players.slice(0, 5)

        if (userId) {
          const myProfile = await getUserProfileForSport(userId, s.id)
          if (myProfile) {
            // compute ranks with ties (same algorithm as ladder page)
            const ranks: number[] = []
            let lastRank = 0
            for (let i = 0; i < players.length; i++) {
              if (i === 0) {
                ranks.push(1)
                lastRank = 1
              } else {
                const prev = players[i - 1]
                if (players[i].rating === prev.rating) {
                  ranks.push(lastRank)
                } else {
                  ranks.push(i + 1)
                  lastRank = i + 1
                }
              }
            }

            const myIndex = players.findIndex(p => p.user_id === userId || p.id === myProfile.id)
            const myRank = myIndex >= 0 ? ranks[myIndex] : null

            if (myRank) {
              let challengable: any[] = []

              // If the user is in the top 10, they can challenge any of the top 10 players
              if (myRank <= 10) {
                challengable = players
                  .map((p, i) => ({ ...p, rank: ranks[i] }))
                  .filter(p => p.id !== myProfile.id && p.rank <= 10)
                  .slice(0, 10)
              } else {
                // Otherwise they can challenge up to 10 ranks above
                const minRank = Math.max(1, myRank - 10)
                challengable = players
                  .map((p, i) => ({ ...p, rank: ranks[i] }))
                  .filter(p => p.rank < myRank && p.rank >= minRank)
                  .slice(0, 10)
              }

              challengables[s.id] = challengable
            } else {
              challengables[s.id] = []
            }
          } else {
            challengables[s.id] = []
          }
        } else {
          challengables[s.id] = []
        }
      }

      setTopLists(tops)
      setChallengeLists(challengables)
      setLoadingLists(false)

      // load user's player profiles and pending challenges for signed-in user
      if (userId) {
        try {
          const { supabase } = await import('@/lib/supabase/client')
          const { data: profiles } = await supabase.from('player_profiles').select('id, sport_id').eq('user_id', userId)
          const profileIds = (profiles || []).map((p: any) => p.id)
          setUserProfileIds(profileIds)

          if (profileIds.length > 0) {
            const pending = await getPendingChallengesForUser(userId)
            setPendingChallenges(pending)
          }

          const joinedSportIds = (profiles || []).map((p: any) => p.sport_id)
          setUnjoinedSports(sports.filter(s => !joinedSportIds.includes(s.id)))
        } catch (e) {
          console.error('Error loading user profiles or pending challenges:', e)
          setPendingChallenges([])
          setUserProfileIds([])
        }
      } else {
        setPendingChallenges([])
        setUserProfileIds([])
        setUnjoinedSports(sports)
      }
    }

    if (sports.length > 0) loadLists()
  }, [sports, userId, getPlayersForSport, getUserProfileForSport, getPendingChallengesForUser])

  async function join() {
    if (!user) {
      router.push('/login')
      return
    }
    if (!sportId) {
      setMessage('Please select a sport to join.')
      return
    }

    // ask for confirmation before joining
    const sportName = sports.find(s => s.id === sportId)?.name ?? 'this sport'
    const confirmed = window.confirm(`Join ${sportName} ladder? Are you sure you want to join?`)
    if (!confirmed) return

    setSubmitting(true)
    setMessage(null)

    const { error } = await (await import('@/lib/supabase/client')).supabase.from('player_profiles').insert({ user_id: user.id, sport_id: sportId })
    setSubmitting(false)

    if (error) {
      // handle unique constraint error (already joined)
      if (error.code === '23505' || /duplicate|unique/.test(error.message || '')) {
        setMessage('You already joined this sport.')
      } else {
        setMessage(error.message)
      }
      return
    }

    setMessage('Joined! Redirecting to the ladder...')
    // Redirect to the ladder for the joined sport
    router.push(`/ladder?sport=${sportId}`)
  }

  async function handleChallenge(sportId: string, opponentProfileId: string) {
    if (!user) {
      router.push('/login')
      return
    }

    const myProfile = await getUserProfileForSport(user.id, sportId)
    if (!myProfile) {
      setMessage('Join this sport before challenging someone.')
      return
    }

    setSubmitting(true)
    try {
      await createChallenge(sportId, myProfile.id, opponentProfileId)
      setMessage('Challenge sent!')
      // refresh lists
      const players = await getPlayersForSport(sportId)
      setTopLists(prev => ({ ...prev, [sportId]: players.slice(0, 5) }))
      // recompute challengables for the sport
      const ranks: number[] = []
      let lastRank = 0
      for (let i = 0; i < players.length; i++) {
        if (i === 0) {
          ranks.push(1)
          lastRank = 1
        } else {
          const prev = players[i - 1]
          if (players[i].rating === prev.rating) {
            ranks.push(lastRank)
          } else {
            ranks.push(i + 1)
            lastRank = i + 1
          }
        }
      }

      const myIndex = players.findIndex(p => p.user_id === user.id || p.id === myProfile.id)
      const myRank = myIndex >= 0 ? ranks[myIndex] : null
      if (myRank) {
        let challengable: any[] = []
        if (myRank <= 10) {
          challengable = players
            .map((p, i) => ({ ...p, rank: ranks[i] }))
            .filter(p => p.id !== myProfile.id && p.rank <= 10)
            .slice(0, 10)
        } else {
          const minRank = Math.max(1, myRank - 10)
          challengable = players
            .map((p, i) => ({ ...p, rank: ranks[i] }))
            .filter(p => p.rank < myRank && p.rank >= minRank)
            .slice(0, 10)
        }
        setChallengeLists(prev => ({ ...prev, [sportId]: challengable }))
      }
    } catch (err: any) {
      setMessage(err?.message || 'Unable to create challenge')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div>Loading…</div>

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
      <aside className="md:col-span-1 space-y-6 md:order-last">
        <Card className='shadow-lg'>
          <CardHeader>
            <CardTitle className="text-center text-shadow font-bold text-lg">Join a Ladder</CardTitle>
          </CardHeader>
          <CardContent>
            {!user ? (
              <div className="text-center">
                <p className="mb-4 text-sm text-muted-foreground">You need to sign in to join a ladder.</p>
                <Button onClick={() => router.push('/login')} className='shadow-sm font-bold'>Sign in</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Select onValueChange={setSportId} defaultValue={sportId ?? undefined}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose sport" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border">
                    {unjoinedSports.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-3">
                  <Button onClick={join} disabled={submitting} className="w-full">
                    {submitting ? 'Joining…' : 'Join Ladder'}
                  </Button>
                  <Button onClick={() => router.push('/ladder')} variant="secondary" className="w-full">
                    View ladders
                  </Button>
                </div>

                {message && <p className="text-sm text-muted-foreground">{message}</p>}
              </div>
            )}
          </CardContent>
        </Card>
        {pendingChallenges.length > 0 && (
          <PendingChallenges challenges={pendingChallenges} currentUserIds={userProfileIds} />
        )}
      </aside>

      <main className="md:col-span-2 space-y-6">
        {sports.length > 0 ? (
          <Tabs defaultValue={sports[0].id} className="w-full">
            <TabsList className='shadow-sm'>
              {sports.map((s) => (
                <TabsTrigger
                  key={s.id}
                  value={s.id}
                  className='font-bold'
                >
                  {s.name}
                </TabsTrigger>
              ))}
            </TabsList>
            {sports.map(s => (
              <TabsContent key={s.id} value={s.id}>
                <LadderList
                  sports={[s]}
                  topLists={topLists}
                  challengeLists={challengeLists}
                  loadingLists={loadingLists}
                  submitting={submitting}
                  handleChallenge={handleChallenge}
                />
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <p className="text-muted-foreground">No sports available.</p>
        )}
      </main>
    </div>
  )
}
