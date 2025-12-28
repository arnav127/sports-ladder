
'use client'
import { useEffect, useState, useMemo, createRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import useUser from '@/lib/hooks/useUser'
import useLadders from '@/lib/hooks/useLadders'
import RankingsTable from '@/components/rankings/RankingsTable'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function LadderPage() {
  const { user, loading } = useUser()
  const { sports, getPlayersForSport, getUserProfileForSport, createChallenge } = useLadders()
  const [players, setPlayers] = useState<any[]>([])
  const [selectedSport, setSelectedSport] = useState<any | null>(null)
  const [challengables, setChallengables] = useState<Set<string>>(new Set())
  const [submittingChallenge, setSubmittingChallenge] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const playerRefs = useMemo(() => Array(players.length).fill(0).map(() => createRef<HTMLTableRowElement>()), [players])

  // when sports are available, set selected sport from query param if present
  useEffect(() => {
    const sportParam = searchParams.get('sport')
    if (!sportParam || sports.length === 0) return

    const found = sports.find(s => s.id === sportParam)
    if (found) setSelectedSport(found)
  }, [sports, searchParams])

  // fetch players when selected sport changes
  useEffect(() => {
    if (!selectedSport) return
    let cancelled = false

    ;(async () => {
      const p = await getPlayersForSport(selectedSport.id)
      if (cancelled) return
      setPlayers(p)

      // compute ranks (standard competition ranking)
      const ranks: number[] = []
      let lastRank = 0
      for (let i = 0; i < p.length; i++) {
        if (i === 0) {
          ranks.push(1)
          lastRank = 1
        } else {
          const prev = p[i - 1]
          if (p[i].rating === prev.rating) {
            ranks.push(lastRank)
          } else {
            ranks.push(i + 1)
            lastRank = i + 1
          }
        }
      }

      if (!user) {
        setChallengables(new Set())
        return
      }

      const myProfile = await getUserProfileForSport(user.id, selectedSport.id)
      if (!myProfile) {
        setChallengables(new Set())
        return
      }

      const myIndex = p.findIndex(pp => pp.user_id === user.id || pp.id === myProfile.id)
      const myRank = myIndex >= 0 ? ranks[myIndex] : null

      let challengableArr: any[] = []
      if (myRank) {
        if (myRank <= 10) {
          challengableArr = p
            .map((pp, i) => ({ ...pp, rank: ranks[i] }))
            .filter(pp => pp.id !== myProfile.id && pp.rank <= 10)
            .slice(0, 10)
        } else {
          const minRank = Math.max(1, myRank - 10)
          challengableArr = p
            .map((pp, i) => ({ ...pp, rank: ranks[i] }))
            .filter(pp => pp.rank < myRank && pp.rank >= minRank)
            .slice(0, 10)
        }
      }

      setChallengables(new Set(challengableArr.map(x => x.id)))
    })()

    return () => {
      cancelled = true
    }
  }, [selectedSport, user, getPlayersForSport, getUserProfileForSport])

  useEffect(() => {
    const profileId = searchParams.get('profile')
    if (profileId && players.length > 0) {
      const playerIndex = players.findIndex(p => p.id === profileId)
      if (playerIndex !== -1) {
        playerRefs[playerIndex].current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [players, searchParams, playerRefs])

  const ranks = useMemo(() => {
    const res: number[] = []
    let lastRank = 0
    for (let i = 0; i < players.length; i++) {
      const p = players[i]
      if (i === 0) {
        res.push(1)
        lastRank = 1
      } else {
        const prev = players[i - 1]
        if (p.rating === prev.rating) {
          res.push(lastRank)
        } else {
          res.push(i + 1)
          lastRank = i + 1
        }
      }
    }
    return res
  }, [players])

  async function handleChallenge(opponentProfileId: string) {
    if (!selectedSport || !user) {
      router.push('/login')
      return
    }

    const myProfile = await getUserProfileForSport(user.id, selectedSport.id)
    if (!myProfile) {
      setMessage('Join this sport before challenging someone.')
      return
    }

    if (!challengables.has(opponentProfileId)) {
      setMessage('You cannot challenge this player.')
      return
    }

    setSubmittingChallenge(opponentProfileId)
    setMessage(null)

    try {
      await createChallenge(selectedSport.id, myProfile.id, opponentProfileId)
      setMessage('Challenge sent!')

      // refresh players and challengables
      const p = await getPlayersForSport(selectedSport.id)
      setPlayers(p)

      // recompute ranks and challengables (same logic as above)
      const ranks2: number[] = []
      let last2 = 0
      for (let i = 0; i < p.length; i++) {
        if (i === 0) {
          ranks2.push(1)
          last2 = 1
        } else {
          const prev = p[i - 1]
          if (p[i].rating === prev.rating) {
            ranks2.push(last2)
          } else {
            ranks2.push(i + 1)
            last2 = i + 1
          }
        }
      }

      const myIndex = p.findIndex(pp => pp.user_id === user.id || pp.id === myProfile.id)
      const myRank = myIndex >= 0 ? ranks2[myIndex] : null
      let challengableArr: any[] = []
      if (myRank) {
        if (myRank <= 10) {
          challengableArr = p
            .map((pp, i) => ({ ...pp, rank: ranks2[i] }))
            .filter(pp => pp.id !== myProfile.id && pp.rank <= 10)
            .slice(0, 10)
        } else {
          const minRank = Math.max(1, myRank - 10)
          challengableArr = p
            .map((pp, i) => ({ ...pp, rank: ranks2[i] }))
            .filter(pp => pp.rank < myRank && pp.rank >= minRank)
            .slice(0, 10)
        }
      }

      setChallengables(new Set(challengableArr.map(x => x.id)))
    } catch (err: any) {
      setMessage(err?.message || 'Unable to create challenge')
    } finally {
      setSubmittingChallenge(null)
    }
  }

  if (loading) return <div>Loading…</div>

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <aside className="md:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle className='text-center text-2xl font-bold text-shadow-sm'>Sports</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {sports.map(s => (
                <li key={s.id}>
                  <Button
                    variant={selectedSport?.id === s.id ? 'default' : 'secondary'}
                    onClick={() => setSelectedSport(s)}
                    className="w-full justify-start font-bold"
                  >
                    {s.name}
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </aside>

      <section className="md:col-span-3">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>{selectedSport ? `${selectedSport.name} Ladder` : 'Select a sport'}</CardTitle>
            {!user && (
              <CardDescription>
                Viewing as guest. Sign in to join ladders and challenge players.
                <Button asChild size="sm" className="ml-2">
                  <Link href="/login">Sign in</Link>
                </Button>
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {message && <p className="mb-4 text-sm text-muted-foreground">{message}</p>}

            {selectedSport ? (
              <RankingsTable
                players={players}
                ranks={ranks}
                challengables={challengables}
                submittingChallenge={submittingChallenge}
                handleChallenge={handleChallenge}
                selectedSport={selectedSport}
                user={user}
                playerRefs={playerRefs}
              />
            ) : (
              <p className="text-muted-foreground">Choose a sport to view its ladder.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
