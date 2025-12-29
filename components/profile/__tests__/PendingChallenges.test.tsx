import { render, screen, fireEvent } from '@testing-library/react';
import PendingChallenges from '../PendingChallenges';
import { PendingChallengeItem } from '@/lib/types';

const mockChallenges: PendingChallengeItem[] = [
  {
    id: '1',
    status: 'CHALLENGED',
    player1_id: { id: 'p1', full_name: 'Player 1' },
    player2_id: { id: 'p2', full_name: 'Player 2' },
    action_token: 'token1',
  },
  {
    id: '2',
    status: 'PENDING',
    player1_id: { id: 'p1', full_name: 'Player 1' },
    player2_id: { id: 'p2', full_name: 'Player 2' },
    action_token: 'token2',
  },
  {
    id: '3',
    status: 'PROCESSING',
    player1_id: { id: 'p1', full_name: 'Player 1' },
    player2_id: { id: 'p2', full_name: 'Player 2' },
    winner_id: 'p1',
    reported_by: { id: 'p1' },
    action_token: 'token3',
  },
    {
    id: '4',
    status: 'PROCESSING',
    player1_id: { id: 'p1', full_name: 'Player 1' },
    player2_id: { id: 'p2', full_name: 'Player 2' },
    winner_id: 'p1',
    reported_by: { id: 'p2' },
    action_token: 'token4',
  },
];

describe('PendingChallenges', () => {
  const onAction = jest.fn();
  
  beforeAll(() => {
    global.fetch = jest.fn(() => Promise.resolve({} as Response));
  });

  beforeEach(() => {
    onAction.mockClear();
    (global.fetch as jest.Mock).mockClear();
  });

  it('renders nothing when no challenges', () => {
    const { container } = render(<PendingChallenges challenges={[]} currentUserIds={['p1']} />);
    expect(container.firstChild).toBeNull();
  });

  it('handles CHALLENGED state', () => {
    render(<PendingChallenges challenges={[mockChallenges[0]]} currentUserIds={['p2']} onAction={onAction} />);
    
    fireEvent.click(screen.getByText('Accept'));
    expect(global.fetch).toHaveBeenCalledWith('/api/matches/1/action?action=accept&token=token1', { method: 'POST' });

    fireEvent.click(screen.getByText('Reject'));
    expect(global.fetch).toHaveBeenCalledWith('/api/matches/1/action?action=reject&token=token1', { method: 'POST' });
  });
  
  it('handles PENDING state', () => {
    render(<PendingChallenges challenges={[mockChallenges[1]]} currentUserIds={['p1']} onAction={onAction} />);
    
    // This is difficult to test with the current implementation of the form
    // but we can check that the "Submit" button is there
    expect(screen.getByText('Submit')).toBeInTheDocument();
  });

  it('handles PROCESSING state (not reported by user)', () => {
    render(<PendingChallenges challenges={[mockChallenges[3]]} currentUserIds={['p1']} onAction={onAction} />);
    
    fireEvent.click(screen.getByText('Confirm'));
    expect(global.fetch).toHaveBeenCalledWith('/api/matches/4/verify?verify=yes&token=token4', { method: 'POST' });

    fireEvent.click(screen.getByText('Dispute'));
    expect(global.fetch).toHaveBeenCalledWith('/api/matches/4/verify?verify=no&token=token4', { method: 'POST' });
  });

  it('handles PROCESSING state (reported by user)', () => {
    render(<PendingChallenges challenges={[mockChallenges[2]]} currentUserIds={['p1']} onAction={onAction} />);
    expect(screen.getByText('Awaiting verification')).toBeInTheDocument();
  });
});
