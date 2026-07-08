import { NextResponse } from 'next/server';
import { libsql, dbReady } from '@/lib/db';

export async function GET() {
  try {
    await dbReady;
    // Test actual database connection
    const result = await libsql.execute('SELECT 1 as ok');
    const tables = await libsql.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    return NextResponse.json({
      status: 'ok',
      db: result.rows[0],
      tables: tables.rows.map((r: any) => r.name),
      env: {
        hasDbUrl: !!process.env.DATABASE_URL,
        hasAuthToken: !!process.env.DATABASE_AUTH_TOKEN,
        dbUrlPrefix: process.env.DATABASE_URL?.substring(0, 20) || 'none',
      }
    });
  } catch (e: any) {
    return NextResponse.json({
      status: 'error',
      message: e.message,
      env: {
        hasDbUrl: !!process.env.DATABASE_URL,
        hasAuthToken: !!process.env.DATABASE_AUTH_TOKEN,
        dbUrlPrefix: process.env.DATABASE_URL?.substring(0, 20) || 'none',
      }
    }, { status: 500 });
  }
}