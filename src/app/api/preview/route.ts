import { draftMode } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const secret = searchParams.get('secret');
  const expectedSecret = process.env.PREVIEW_SECRET;

  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ message: 'Invalid preview secret' }, { status: 401 });
  }

  if (!url || !url.startsWith('/')) {
    return NextResponse.json({ message: 'Missing or invalid url' }, { status: 400 });
  }

  const status = searchParams.get('status');
  const locale = searchParams.get('locale');

  draftMode().enable();

  const redirectUrl = new URL(url, request.url);
  if (status) {
    redirectUrl.searchParams.set('status', status);
  }
  if (locale) {
    redirectUrl.searchParams.set('locale', locale);
  }

  return NextResponse.redirect(redirectUrl);
}
