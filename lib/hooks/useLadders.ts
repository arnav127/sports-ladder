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

  const getRecentMatches = useCallback(async (limit = 5) => {
    const { data } = await supabase
      .from('matches')
      .select('id, sport_id, player1_id, player2_id, winner_id, status, created_at, sports(id, name)')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (!data) return []

    const matches = (data as any[])

    // resolve player profiles for display
    const ids = Array.from(new Set(matches.flatMap((m) => [m.player1_id, m.player2_id].filter(Boolean)))) as string[]
    const profilesMap: Record<string, { id: string; full_name?: string; avatar_url?: string }> = {}
    if (ids.length) {
      const { data: profiles } = await supabase.from('player_profiles_view').select('id, full_name, avatar_url').in('id', ids)
      ;(profiles || []).forEach((p: any) => { profilesMap[p.id] = p })
    }

    return matches.map((m) => ({
      id: m.id,
      sport_id: m.sport_id,
      sport_name: (m.sports && (m.sports as any).name) || null,
      player1: m.player1_id ? { id: m.player1_id, full_name: profilesMap[m.player1_id]?.full_name, avatar_url: profilesMap[m.player1_id]?.avatar_url } : null,
      player2: m.player2_id ? { id: m.player2_id, full_name: profilesMap[m.player2_id]?.full_name, avatar_url: profilesMap[m.player2_id]?.avatar_url } : null,
      winner_id: m.winner_id,
      status: m.status,
      created_at: m.created_at,
    }))
  }, [])

  const getRecentMatchesForProfiles = useCallback(async (profileIds: string[], per = 3) => {
    if (!profileIds || profileIds.length === 0) return {}
    // fetch matches where either player1_id or player2_id is in the list
    // to reduce results we fetch at most profileIds.length * per * 3 rows
    const fetchLimit = Math.max(50, profileIds.length * per * 3)
    const orClause = profileIds.map((id) => `player1_id.eq.${id}`).concat(profileIds.map((id) => `player2_id.eq.${id}`)).join(',')
    const { data } = await supabase
      .from('matches')
      .select('id, sport_id, player1_id, player2_id, winner_id, status, created_at')
      .or(orClause)
      .order('created_at', { ascending: false })
      .limit(fetchLimit)

    const matches = (data || []) as Match[]
    // build profile id -> recent matches (as MatchHistoryItem)
    const map: Record<string, any[]> = {}
    profileIds.forEach((id) => (map[id] = []))

    // For nicer display, resolve profile names for participants referenced
    const ids = Array.from(new Set(matches.flatMap((m) => [m.player1_id, m.player2_id].filter(Boolean)))) as string[]
    const profilesMap: Record<string, { id: string; full_name?: string; avatar_url?: string }> = {}
    if (ids.length) {
      const { data: profiles } = await supabase.from('player_profiles_view').select('id, full_name, avatar_url').in('id', ids)
      ;(profiles || []).forEach((p: any) => { profilesMap[p.id] = p })
    }

    const finalStatuses = ['CONFIRMED', 'PROCESSED']

    for (const m of matches) {
      for (const pid of profileIds) {
        if (map[pid].length >= per) continue
        if (m.player1_id === pid || m.player2_id === pid) {
          const isPlayer1 = m.player1_id === pid
          const opponentId = isPlayer1 ? m.player2_id : m.player1_id
          const opponent = opponentId ? profilesMap[opponentId] : null
          const result = finalStatuses.includes(m.status) ? (m.winner_id === pid ? 'win' : 'loss') : null
          map[pid].push({ id: m.id, created_at: m.created_at, status: m.status, result, opponent: opponent ? { id: opponent.id, full_name: opponent.full_name, avatar_url: opponent.avatar_url } : null })
        }
      }
    }

    return map
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

  return { sports, getPlayersForSport, getUserProfileForSport, createChallenge, createMatch, getMatchesForProfile, getRecentMatchesForProfiles, getProfileStats, getRankForProfile, getPendingChallengesForUser, getAllPlayers, getUserProfiles }
}
