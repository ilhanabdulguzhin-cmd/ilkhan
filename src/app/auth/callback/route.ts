import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) return NextResponse.redirect(new URL('/auth?error=callback', url.origin))
  }
  const requestedNext = url.searchParams.get('next')
  const next = requestedNext && /^\/(dashboard|business|settings|onboarding)(\/|$)/.test(requestedNext) ? requestedNext : '/dashboard'
  return NextResponse.redirect(new URL(next, url.origin))
}
