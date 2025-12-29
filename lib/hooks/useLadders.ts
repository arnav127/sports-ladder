'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Sport, PlayerProfile, Match, MatchWithPlayers } from '@/lib/types'

export default function useLadders() {
  const [sports, setSports] = useState<Sport[]>([])

  useEffect(() => {
    supabase
      .from('sports')
      .select('id, name')
      .order('name')
      .then((res) => setSports((res.data as Sport[]) ?? []))
  }, [])

  const getPlayersForSport = useCallback(async (sportId: string, limit?: number): Promise<PlayerProfile[]> => {
    // Use the view that joins `auth.users` so we can show email/avatar/name
    let query = supabase
      .from('player_profiles_view')
      .select('id, user_id, sport_id, rating, matches_played, user_email, user_metadata, full_name, avatar_url')
      .eq('sport_id', sportId)
      .order('rating', { ascending: false })

    if (limit) query = query.limit(limit)

    const { data } = await query

    return (data as PlayerProfile[]) ?? []
  }, [])

  const getUserProfileForSport = useCallback(async (userId: string, sportId: string): Promise<PlayerProfile | null> => {
    const { data } = await supabase
      .from('player_profiles')
      .select('id, user_id, sport_id, rating, matches_played')
      .eq('user_id', userId)
      .eq('sport_id', sportId)
      .limit(1)

    return (data && (data[0] as PlayerProfile)) ?? null
  }, [])

  const createChallenge = useCallback(
    async (sportId: string, challengerProfileId: string, opponentProfileId: string, message?: string) => {
      const response = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sportId, challengerProfileId, opponentProfileId, message }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create challenge')
      }
      return data
    },
    []
  )

  const createMatch = useCallback(async (sportId: string, player1Id: string, player2Id: string) => {
    const { data, error } = await supabase.from('matches').insert({ sport_id: sportId, player1_id: player1Id, player2_id: player2Id })
    if (error) throw error
    return data
  }, [])

  // Use helper functions for matches/stats/rank (supabaseHelpers)
  const getMatchesForProfile = useCallback(async (profileId: string, limit = 5) => {
    const { getMatchesForProfile } = await import('../supabase/supabaseHelpers')
    return getMatchesForProfile(profileId, limit)
  }, [])

  const getProfileStats = useCallback(async (profileId: string) => {
    const { getProfileStats } = await import('../supabase/supabaseHelpers')
    return getProfileStats(profileId)
  }, [])

  const getRankForProfile = useCallback(async (profileId: string, sportId: string) => {
    const { getRankForProfile } = await import('../supabase/supabaseHelpers')
    return getRankForProfile(profileId, sportId)
  }, [])

  const getPendingChallengesForUser = useCallback(async (userId: string): Promise<MatchWithPlayers[]> => {
    // Find all player profile ids for this user
    const { data: profiles } = await supabase.from('player_profiles').select('id').eq('user_id', userId)
    const ids = (profiles || []).map((r) => r.id)
    if (!ids.length) return []

    const { data } = await supabase
      .from('matches')
      .select('id, sport_id, player1_id, player2_id, status, message, action_token, winner_id, reported_by, created_at')
      .or(ids.map((id: string) => `player1_id.eq.${id}`).concat(ids.map((id: string) => `player2_id.eq.${id}`)).join(','))
      .in('status', ['CHALLENGED', 'PENDING', 'PROCESSING'])
      .order('created_at', { ascending: false })

    if (!data) return []

    const matches = data as Match[]
    // Resolve profile info for player ids
    const idsInMatches = Array.from(new Set(matches.flatMap((m) => [m.player1_id, m.player2_id].filter(Boolean)))) as string[]
    const profilesMap: Record<string, PlayerProfile> = {}
    if (idsInMatches.length) {
      const { data: profiles } = await supabase
        .from('player_profiles_view')
        .select('id, full_name, avatar_url, rating')
        .in('id', idsInMatches)
      ;(profiles || []).forEach((p) => {
        profilesMap[p.id] = p as PlayerProfile
      })
    }

    return matches.map((m) => ({
      ...m,
      player1_id: m.player1_id
        ? { id: m.player1_id, full_name: profilesMap[m.player1_id]?.full_name, avatar_url: profilesMap[m.player1_id]?.avatar_url, rating: profilesMap[m.player1_id]?.rating }
        : null,
      player2_id: m.player2_id
        ? { id: m.player2_id, full_name: profilesMap[m.player2_id]?.full_name, avatar_url: profilesMap[m.player2_id]?.avatar_url, rating: profilesMap[m.player2_id]?.rating }
        : null,
      reported_by: m.reported_by
        ? { id: m.reported_by, full_name: profilesMap[m.reported_by]?.full_name, avatar_url: profilesMap[m.reported_by]?.avatar_url, rating: profilesMap[m.reported_by]?.rating }
        : null,
    }))
  }, [])

  const getAllPlayers = useCallback(async (): Promise<PlayerProfile[]> => {
    const { data } = await supabase
      .from('player_profiles_view')
      .select('id, user_id, sport_id, rating, matches_played, user_email, user_metadata, full_name, avatar_url')
      .order('rating', { ascending: false })

    return (data as PlayerProfile[]) ?? []
  }, [])

  const getUserProfiles = useCallback(async (userId: string): Promise<PlayerProfile[]> => {
    const { data } = await supabase
      .from('player_profiles')
      .select('id, user_id, sport_id, rating, matches_played')
      .eq('user_id', userId)

    return (data as PlayerProfile[]) ?? []
  }, [])

  return { sports, getPlayersForSport, getUserProfileForSport, createChallenge, createMatch, getMatchesForProfile, getProfileStats, getRankForProfile, getPendingChallengesForUser, getAllPlayers, getUserProfiles }
}
