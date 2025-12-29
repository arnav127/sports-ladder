

export type Sport = {
  id: string
  name: string
}

export type PlayerProfile = {
  id: string
  user_id: string
  sport_id: string
  rating: number
  matches_played: number
  user_email?: string
  user_metadata?: unknown
  full_name?: string
  avatar_url?: string
}

export type Match = {
  id: string
  sport_id: string
  player1_id: string | null
  player2_id: string | null
  status: string
  message?: string | null
  action_token?: string | null
  winner_id?: string | null
  reported_by?: string | null
  created_at: string
}

export type MatchWithPlayers = Omit<Match, 'player1_id' | 'player2_id' | 'reported_by'> & {
  player1_id: Partial<PlayerProfile> | null
  player2_id: Partial<PlayerProfile> | null
  reported_by: Partial<PlayerProfile> | null
}

export type RankedPlayerProfile = PlayerProfile & {
  rank: number
}

export type MatchResult = 'win' | 'loss' | null

export type MatchHistoryItem = {
  id: string
  created_at: string
  status: string
  result?: MatchResult
  opponent?: {
    id: string
    full_name?: string
    avatar_url?: string
  } | null
}

export type PendingChallengeItem = {
  id: string
  sport_id: string
  player1_id: { id: string; full_name?: string; avatar_url?: string }
  player2_id: { id: string; full_name?: string; avatar_url?: string }
  status: string
  message?: string | null
  action_token?: string | null
  winner_id?: string | null
  reported_by?: { id: string } | null
  created_at: string
  result?: MatchResult
}

export type PlayerStats = {
  total: number
  wins: number
  losses: number
  winRate: number
}

export type RankInfo = {
  rank: number | null
  total: number
}

export type RatingHistoryItem = {
  created_at: string
  new_rating: number
}

export type PlayerProfileExtended = PlayerProfile & {
  sport_name?: string
  stats?: PlayerStats
  rankInfo?: RankInfo
  recentMatches?: MatchHistoryItem[]
  pendingChallenges?: PendingChallengeItem[]
  ratingHistory?: RatingHistoryItem[]
}