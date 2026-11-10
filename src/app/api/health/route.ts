// GET /api/health -> { ok: true }. For uptime monitors and the host's health check.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const GET = () => NextResponse.json({ ok: true, time: new Date().toISOString() });
