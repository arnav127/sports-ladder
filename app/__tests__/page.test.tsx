import { render, screen } from '@testing-library/react';
import Home from '../page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  usePathname: () => '/',
}));

jest.mock('@/lib/hooks/useUser', () => ({
  __esModule: true,
  default: () => ({ user: null, loading: false }),
}));

jest.mock('@/lib/hooks/useLadders', () => ({
  __esModule: true,
  default: () => ({
    sports: [],
    getPlayersForSport: jest.fn(),
    getUserProfileForSport: jest.fn(),
    createChallenge: jest.fn(),
    getPendingChallengesForUser: jest.fn(),
    getAllPlayers: jest.fn(),
    getUserProfiles: jest.fn(),
  }),
}));

describe('Home', () => {
  it("renders 'Join a Ladder' text", () => {
    render(<Home />);

    const joinText = screen.getByText(/^Join a Ladder$/i);

    expect(joinText).toBeInTheDocument();
  });
});
