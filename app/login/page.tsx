'use client'
import { useState, useEffect, Suspense } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { AlertCircle } from 'lucide-react'

function LoginForm() {
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  useEffect(() => {
    if (error === 'domain_restricted') {
      supabase.auth.signOut()
    }
  }, [error])

  async function signInWithGoogle() {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/'
      }
    })
    setLoading(false)
  }

  return (
    <div className="w-full max-w-md p-8 bg-background rounded-xl border shadow-xl">
      <h1 className="scroll-m-20 text-3xl mt-1 font-bold tracking-tight text-shadow-sm text-center mb-4">Sign in</h1>
      <p className="text-sm text-muted-foreground mb-6 text-center">Sign in with your Google account to view your ladders and profile.</p>

      {error === 'domain_restricted' && (
        <div className="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive dark:border-destructive dark:text-red-400">
          <div className="flex items-center gap-2 font-bold mb-1">
            <AlertCircle className="h-4 w-4" />
            Access Denied
          </div>
          <div className="text-sm opacity-90">
            Only users with an <strong>@iima.ac.in</strong> email address are allowed to access this application.
          </div>
        </div>
      )}

      <Button
        onClick={signInWithGoogle}
        className="w-full flex items-center justify-center gap-2 h-11 text-base"
        disabled={loading}
      >
        <Image src="/google.svg" alt="Google" width={20} height={20} />
        <span>{loading ? 'Redirecting...' : 'Continue with Google'}</span>
      </Button>
      <p className="text-xs text-muted-foreground mt-4 text-center">Only <strong>@iima.ac.in</strong> Google sign-in is supported for accessing private ladders.</p>
    </div>
  )
}

export default function Login() {
  return (
    <div className="flex h-screen items-center justify-center rounded p-4">
      <Suspense fallback={<div>Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
