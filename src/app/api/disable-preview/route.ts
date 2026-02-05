import { draftMode } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url') || '/';

  draftMode().disable();

  const redirectUrl = new URL(url, request.url);
  return NextResponse.redirect(redirectUrl);
}
