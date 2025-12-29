import { getProfileStats, getRankForProfile, getMatchesForProfile } from '../supabaseHelpers';
import { supabase } from '@/lib/supabase/client';

jest.mock('@/lib/supabase/client');

describe('supabaseHelpers', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMatchesForProfile', () => {
    it('correctly determines match results', async () => {
      const mockMatches = [
        { id: 'm1', player1_id: 'p1', player2_id: 'p2', winner_id: 'p1', status: 'CONFIRMED' },
        { id: 'm2', player1_id: 'p1', player2_id: 'p2', winner_id: 'p2', status: 'PROCESSED' },
        { id: 'm3', player1_id: 'p1', player2_id: 'p2', winner_id: null, status: 'PENDING' },
      ];
      const mockProfiles = [
        { id: 'p1', full_name: 'Player 1' },
        { id: 'p2', full_name: 'Player 2' },
      ];

      const fromSpy = jest.spyOn(supabase, 'from');
      fromSpy.mockImplementation((tableName: string) => {
        if (tableName === 'matches') {
          return {
            select: jest.fn().mockReturnThis(),
            or: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue({ data: mockMatches }),
          } as any;
        }
        if (tableName === 'player_profiles_view') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({ data: mockProfiles }),
          } as any;
        }
        return { select: jest.fn().mockReturnThis() } as any;
      });

      const matches = await getMatchesForProfile('p1');
      
      expect(matches).toHaveLength(3);
      expect(matches[0].result).toBe('win');
      expect(matches[1].result).toBe('loss');
      expect(matches[2].result).toBeNull();
      expect(matches[0].opponent.full_name).toBe('Player 2');
    });
  });

  describe('getProfileStats', () => {
    it('calculates stats correctly', async () => {
      const mockMatches = [
        { id: '1', winner_id: 'p1', status: 'CONFIRMED' },
        { id: '2', winner_id: 'p2', status: 'PROCESSED' },
        { id: '3', winner_id: 'p1', status: 'CONFIRMED' },
        { id: '4', winner_id: 'p1', status: 'PENDING' },
      ];
      
      const fromSpy = jest.spyOn(supabase, 'from');
      fromSpy.mockImplementation((tableName: string) => {
        if (tableName === 'matches') {
          return {
            select: jest.fn().mockReturnThis(),
            or: jest.fn().mockResolvedValue({ data: mockMatches }),
          } as any;
        }
        return { select: jest.fn().mockReturnThis() } as any;
      });

      const stats = await getProfileStats('p1');
      expect(stats).toEqual({
        total: 3,
        wins: 2,
        losses: 1,
        winRate: 67, // Math.round((2/3)*100)
      });
    });
  });

  describe('getRankForProfile', () => {
    const mockPlayers = [
      { id: 'p1', rating: 2000 },
      { id: 'p2', rating: 1900 },
      { id: 'p3', rating: 1900 },
      { id: 'p4', rating: 1800 },
    ];

    it('calculates rank correctly with ties', async () => {
        
      const fromSpy = jest.spyOn(supabase, 'from');
      fromSpy.mockImplementation((tableName: string) => {
        if (tableName === 'player_profiles_view') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockPlayers }),
          } as any;
        }
        return { select: jest.fn().mockReturnThis() } as any;
      });
      
      const rank1 = await getRankForProfile('p1', 'sport1');
      expect(rank1).toEqual({ rank: 1, total: 4 });

      const rank2 = await getRankForProfile('p2', 'sport1');
      expect(rank2).toEqual({ rank: 2, total: 4 });
      
      const rank3 = await getRankForProfile('p3', 'sport1');
      expect(rank3).toEqual({ rank: 2, total: 4 });
      
      const rank4 = await getRankForProfile('p4', 'sport1');
      expect(rank4).toEqual({ rank: 4, total: 4 });
    });

    it('returns null rank for profile not in list', async () => {
      const fromSpy = jest.spyOn(supabase, 'from');
      fromSpy.mockImplementation((tableName: string) => {
        if (tableName === 'player_profiles_view') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockPlayers }),
          } as any;
        }
        return { select: jest.fn().mockReturnThis() } as any;
      });

      const rank = await getRankForProfile('p5', 'sport1');
      expect(rank).toEqual({ rank: null, total: 4 });
    });
  });
});
