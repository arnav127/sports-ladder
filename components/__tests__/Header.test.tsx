import { render, screen, fireEvent } from '@testing-library/react';
import Header from '../Header';
import { useTheme } from 'next-themes';
import { User } from '@supabase/supabase-js';

// Mock next/router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  usePathname: () => '/',
}));

// Mock next-themes
jest.mock('next-themes', () => ({
  useTheme: jest.fn(() => ({
    theme: 'light',
    setTheme: jest.fn(),
  })),
}));

// Mock supabase client
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: null } })),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      signOut: jest.fn(),
    },
  },
}));

describe('Header', () => {
  it('renders sign-in button when logged out', async () => {
    render(<Header />);
    expect(await screen.findByText(/Sign in with Google/i)).toBeInTheDocument();
  });

  it('renders profile and sign-out button when logged in', async () => {
    const mockUser = { id: '123' } as User;
    const { supabase } = require('@/lib/supabase/client');
    supabase.auth.getUser.mockResolvedValueOnce({ data: { user: mockUser } });

    render(<Header />);

    expect(await screen.findByText(/Profile/i)).toBeInTheDocument();
    expect(await screen.findByText(/Sign out/i)).toBeInTheDocument();
  });

  
  it('toggles theme', () => {
    const setTheme = jest.fn();
    (useTheme as jest.Mock).mockReturnValue({ theme: 'light', setTheme });
    
    render(<Header />);
    const themeButtons = screen.getAllByRole('button', { name: /toggle theme/i });
    fireEvent.click(themeButtons[0]);
    expect(setTheme).toHaveBeenCalledWith('dark');
  });
});
