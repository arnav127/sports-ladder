import { render, screen } from '@testing-library/react';
import RatingHistory from '../RatingHistory';
import { RatingHistoryItem } from '@/lib/types';

// Mock recharts
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
    LineChart: ({ children }: any) => <div>{children}</div>,
    Line: ({ children }: any) => <div>{children}</div>,
    XAxis: () => <div />,
    YAxis: () => <div />,
    Tooltip: () => <div />,
    Legend: () => <div />,
    LabelList: () => <div />,
  };
});

const mockRatingHistory: RatingHistoryItem[] = [
  {
    id: '1',
    match_id: 'match1',
    player_profile_id: 'player1',
    old_rating: 1500,
    new_rating: 1525,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    match_id: 'match2',
    player_profile_id: 'player1',
    old_rating: 1525,
    new_rating: 1510,
    created_at: new Date().toISOString(),
  },
];

describe('RatingHistory', () => {
  it('renders nothing when no history', () => {
    const { container } = render(<RatingHistory ratingHistory={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders chart with data', () => {
    render(<RatingHistory ratingHistory={mockRatingHistory} />);

    expect(screen.getByText('Rating History')).toBeInTheDocument();
    // We can't really test the chart rendering because of the mock,
    // but we can check that the component doesn't crash and renders the title.
  });
});
