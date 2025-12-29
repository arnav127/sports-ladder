import { render, screen, fireEvent } from '@testing-library/react';
import LadderListItem from '../LadderListItem';
import { Sport, PlayerProfile, RankedPlayerProfile } from '@/lib/types';

const mockSport: Sport = {
  id: 'sport1',
  name: 'Tennis',
  created_at: '',
};

const mockTopList: PlayerProfile[] = [
  {
    id: '1',
    user_id: 'user1',
    sport_id: 'sport1',
    rating: 1600,
    user_email: 'player1@example.com',
    full_name: 'Player One',
    avatar_url: '',
  },
  {
    id: '2',
    user_id: 'user2',
    sport_id: 'sport1',
    rating: 1550,
    user_email: 'player2@example.com',
    full_name: 'Player Two',
    avatar_url: '',
  },
];

const mockChallengeList: RankedPlayerProfile[] = [
  {
    id: '3',
    user_id: 'user3',
    sport_id: 'sport1',
    rating: 1500,
    user_email: 'player3@example.com',
    full_name: 'Player Three',
    avatar_url: '',
    rank: 3,
  },
];

describe('LadderListItem', () => {
  const handleChallenge = jest.fn();
  
  // Mock window.confirm
  beforeAll(() => {
    window.confirm = jest.fn(() => true);
  });

  beforeEach(() => {
    handleChallenge.mockClear();
    (window.confirm as jest.Mock).mockClear();
  });

  it('renders sport name and lists', () => {
    render(
      <LadderListItem
        sport={mockSport}
        topList={mockTopList}
        challengeList={mockChallengeList}
        loadingLists={false}
        submitting={false}
        handleChallenge={handleChallenge}
      />
    );

    expect(screen.getByText('Tennis')).toBeInTheDocument();
    expect(screen.getByText('Player One')).toBeInTheDocument();
    expect(screen.getByText('Player Two')).toBeInTheDocument();
    expect(screen.getByText('Player Three')).toBeInTheDocument();
  });

  it('calls handleChallenge when challenge button is clicked', () => {
    render(
      <LadderListItem
        sport={mockSport}
        topList={mockTopList}
        challengeList={mockChallengeList}
        loadingLists={false}
        submitting={false}
        handleChallenge={handleChallenge}
      />
    );

    const challengeButton = screen.getByText('Challenge');
    fireEvent.click(challengeButton);
    
    expect(window.confirm).toHaveBeenCalled();
    expect(handleChallenge).toHaveBeenCalledWith('sport1', '3');
  });

  it('does not call handleChallenge when confirm is cancelled', () => {
    (window.confirm as jest.Mock).mockReturnValueOnce(false);
    render(
      <LadderListItem
        sport={mockSport}
        topList={mockTopList}
        challengeList={mockChallengeList}
        loadingLists={false}
        submitting={false}
        handleChallenge={handleChallenge}
      />
    );

    const challengeButton = screen.getByText('Challenge');
    fireEvent.click(challengeButton);
    
    expect(window.confirm).toHaveBeenCalled();
    expect(handleChallenge).not.toHaveBeenCalled();
  });
});
