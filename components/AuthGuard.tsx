'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import useUser from '@/lib/hooks/useUser'
import { supabase } from '@/lib/supabase/client'

export default function AuthGuard() {
    const { user, loading } = useUser()
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        if (loading) return

        if (user) {
            const email = user.email || ''
            // Check if usage is restricted
            if (!email.endsWith('@iima.ac.in')) {
                // Sign out to clear session ensuring they can't access data
                supabase.auth.signOut().then(() => {
                    router.replace('/login?error=domain_restricted')
                })
            }
        }
    }, [user, loading, router])

    return null
}
