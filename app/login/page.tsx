'use client'
import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'

export default function Login() {
  const [loading, setLoading] = useState(false)

  async function signInWithGoogle() {
    setLoading(true)
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/' } })
    setLoading(false)
  }

  return (
    <div className="flex h-screen items-center justify-center rounded">
      <div className="w-full max-w-md p-8 bg-background rounded shadow-lg">
        <h1 className="scroll-m-20 text-3xl mt-1 font-bold tracking-tight text-shadow-sm text-center mb-4">Sign in</h1>
        <p className="text-sm text-gray-600 mb-6">Sign in with your Google account to view your ladders and profile.</p>
        <Button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-2"
          disabled={loading}
        > 
          <Image src="/google.svg" alt="Google" width={20} height={20} />
          <span>{loading ? 'Redirecting...' : 'Continue with Google'}</span>
        </Button>
        <p className="text-xs text-gray-500 mt-4">Only Google sign-in is supported for accessing private ladders.</p>
      </div>
    </div>
  )
}
