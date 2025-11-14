// /api/upload/routeModule.ts 
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // server-side only
);

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const tenant_id = formData.get("tenant_id") as string;
  const org_id = formData.get("organization_id") as string;

  const path = `${tenant_id}/${Date.now()}-${file.name}`;

  // Upload
  const { error: uploadErr } = await supabase.storage
    .from("coa-bucket")
    .upload(path, file);

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 400 });
  }

  // Public URL
  const { data: urlData } = supabase.storage
    .from("coa-bucket")
    .getPublicUrl(path);

  // Insert DB row
  await supabase.from("attachments_read").insert({
    organization_id: org_id,
    tenant_id,
    attachment_file_name: file.name,
    file_url: urlData.publicUrl,
    storage_object_id: path,
    is_coa: false,
    is_processed: false,
    confidence: "medium",
    received_at: new Date().toISOString()
  });

  return NextResponse.json({ success: true });
}
