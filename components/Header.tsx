'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useTheme } from "next-themes"
import { Button } from './ui/button'
import { Moon, Sun, Monitor, Menu, X } from "lucide-react"
import { User } from '@supabase/supabase-js'

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function ModeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')}
    >
      <Sun className={`h-[1.2rem] w-[1.2rem] transition-all ${theme === 'system' ? 'scale-0 -rotate-90' : 'scale-100 rotate-0 dark:scale-0 dark:-rotate-90'}`} />
      <Moon className={`absolute h-[1.2rem] w-[1.2rem] transition-all ${theme === 'system' ? 'scale-0 rotate-90' : 'scale-0 rotate-90 dark:scale-100 dark:rotate-0'}`} />
      <Monitor className={`absolute h-[1.2rem] w-[1.2rem] transition-all ${theme === 'system' ? 'scale-100 rotate-0' : 'scale-0 rotate-90'}`} />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}

  return (
    <header className="bg-background border-b text-foreground shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="scroll-m-20 text-center text-3xl md:text-4xl font-extrabold tracking-tight text-balance text-shadow-sm">IIMA Sports Ladder</Link>
        <nav className="hidden md:flex items-center gap-4">
          <Link href="/ladder" className="scroll-m-20 text-2xl mt-1 font-bold tracking-tight text-shadow-sm">Ladders</Link>
          {user && (
            <Link href="/profile" className="scroll-m-20 text-2xl mt-1 font-bold tracking-tight text-shadow-sm">Profile</Link>
          )}
          <ModeToggle />
          {user ? (
            <Button onClick={signOut} variant='default' className='scroll-m-20 text-xl font-bold tracking-tight'>Sign out</Button>
          ) : (
            pathname !== '/login' && (
              <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                <Link href="/login">Sign in with Google</Link>
              </Button>
            )
          )}
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          <ModeToggle />
          <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>
      {isMenuOpen && (
        <div className="md:hidden border-t px-4 py-4 space-y-4 bg-background">
          <nav className="flex flex-col gap-4">
            <Link href="/ladder" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold">Ladders</Link>
            {user ? (
              <>
                <Link href="/profile" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold">Profile</Link>
                <Button onClick={() => { signOut(); setIsMenuOpen(false); }} variant='default' className='w-full justify-start text-lg font-bold'>Sign out</Button>
              </>
            ) : (
              pathname !== '/login' && (
                <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white shadow-md w-full justify-start">
                  <Link href="/login" onClick={() => setIsMenuOpen(false)}>Sign in with Google</Link>
                </Button>
              )
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
