/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // SERVER ONLY
);

export async function POST(req: Request) {
  try {
    const { storage_object_id, attachment_surrogate_key } = await req.json();

    if (!storage_object_id || !attachment_surrogate_key) {
      return NextResponse.json(
        { error: "Missing parameters" },
        { status: 400 }
      );
    }

    // Delete from bucket
    const { error: storageErr } = await supabase.storage
      .from("coa-bucket")
      .remove([storage_object_id]);

    if (storageErr) {
      return NextResponse.json({ error: storageErr.message }, { status: 400 });
    }

    // Delete DB row
    const { error: dbErr } = await supabase
      .from("attachments_read")
      .delete()
      .eq("attachment_surrogate_key", attachment_surrogate_key);

    if (dbErr) {
      return NextResponse.json({ error: dbErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
