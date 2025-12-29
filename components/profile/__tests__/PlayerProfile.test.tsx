import { render, screen } from '@testing-library/react';
import PlayerProfile from '../PlayerProfile';
import { PlayerProfileExtended } from '@/lib/types';

const mockPlayer: PlayerProfileExtended = {
  id: '1',
  user_id: 'user1',
  sport_id: 'sport1',
  rating: 1500,
  user_email: 'test@example.com',
  full_name: 'Test Player',
  avatar_url: '',
  sport_name: 'Tennis',
  rankInfo: {
    rank: 11,
    total: 71,
  },
  stats: {
    total: 10,
    wins: 7,
    losses: 3,
    winRate: 70,
  },
  recentMatches: [],
  pendingChallenges: [],
  ratingHistory: [],
};

describe('PlayerProfile', () => {
  it('renders player information', () => {
    render(<PlayerProfile player={mockPlayer} />);

    expect(screen.getByText('Test Player')).toBeInTheDocument();
    expect(screen.getByText('Tennis')).toBeInTheDocument();
    expect(screen.getByText('1500')).toBeInTheDocument();
    expect(screen.getByText(/Rank:/)).toBeInTheDocument();
    expect(screen.getByText('11')).toBeInTheDocument();
    expect(screen.getByText(/\/ 71/)).toBeInTheDocument();
    expect(screen.getByText(/Matches: 10/)).toBeInTheDocument();
    expect(screen.getByText(/Wins: 7/)).toBeInTheDocument();
    expect(screen.getByText(/Losses: 3/)).toBeInTheDocument();
    expect(screen.getByText(/Win rate: 70%/)).toBeInTheDocument();
  });
});
