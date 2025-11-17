


/*
<TASK> : 
create ui to upload and display files in this UI, use shadcn and tailwind css for styling
we are using postgres sql table  in the supabase
file that are the uploaded are saved in supabse bucket called the "coa-buecket" the bucket is public and this the url of the file will be stored in sql table
here is the defnition of the sql table in supabase

create table if not exists attachments_read (
  attachment_surrogate_key uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  tenant_id text not null,

  source_email_address text, -- empty when uploaded from ui
  target_email_address text,-- empty when uploaded from ui

  email_data jsonb,                     -- subject, headers, etc., -- empty when uploaded from ui
  attachment_id text,                   -- Microsoft Graph attachment id 
  attachment_file_name text,

  file_url text,                        -- Supabase Storage public URL
  storage_object_id text,               -- path inside the bucket

  is_coa boolean default false, -- false
  is_processed boolean default false, --false
  confidence text check (confidence in ('high','medium','low')) default 'medium',

  received_at timestamptz,
  ingested_at timestamptz default now()
);

create index if not exists idx_attach_org on attachments_read(organization_id);
create index if not exists idx_attach_tenant on attachments_read(tenant_id);
create index if not exists idx_attach_email on attachments_read(target_email_address);
create index if not exists idx_attach_ingested on attachments_read(ingested_at desc);

display the important information about the uploaded files here, show theri status about whether they are processed  till now not  and whether they are processed
the table should be sortable and filterable
make the ui look good

*/
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Trash } from "lucide-react";

// Supabase client only for reading (anon key)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface FileUploadProps {
  organization_id: string;
  tenant_id: string;
}

interface AttachmentRow {
  attachment_surrogate_key: string;
  attachment_file_name: string;
  file_url: string;
  storage_object_id: string;
  is_processed: boolean;
  is_coa: boolean;
  confidence: string;
  ingested_at: string;
}

export default function FileUpload({ organization_id, tenant_id }: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [rows, setRows] = useState<AttachmentRow[]>([]);
  const [loading, setLoading] = useState(false);

  // -------------------------------
  // Load table data
  // -------------------------------
  const loadRows = async () => {
    const { data, error } = await supabase
      .from("attachments_read")
      .select("*")
      .eq("organization_id", organization_id)
      .eq("tenant_id", tenant_id)
      .order("ingested_at", { ascending: false });

    if (!error && data) {
      setRows(data as AttachmentRow[]);
    }
  };

  useEffect(() => {
    const fetchRows = async () => {
      await loadRows();
    };
    fetchRows();
  }, []);

  // -------------------------------
  // Upload handler (calls /api/upload)
  // -------------------------------
  const onUpload = async () => {
    setLoading(true);

    for (const file of files) {
      const form = new FormData();
      form.append("file", file);
      form.append("tenant_id", tenant_id);
      form.append("organization_id", organization_id);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const error = await res.json();
        console.error("Upload error:", error);
      }
    }

    setFiles([]);
    await loadRows();
    setLoading(false);
  };

  // -------------------------------
  // Delete handler (calls /api/delete)
  // -------------------------------
  const handleDelete = useCallback(
  async (item: AttachmentRow) => {
    const confirmDelete = confirm(`Delete "${item.attachment_file_name}"?`);
    if (!confirmDelete) return;

    const res = await fetch("/api/delete", {
      method: "POST",
      body: JSON.stringify({
        attachment_surrogate_key: item.attachment_surrogate_key,
        storage_object_id: item.storage_object_id,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const error = await res.json();
      console.error("Delete error:", error);
      alert("Failed to delete.");
      return;
    }

    await loadRows();
  },
  [loadRows] // needed because handleDelete uses loadRows
);

  // -------------------------------
  // Table Columns
  // -------------------------------
  const columns: ColumnDef<AttachmentRow>[] = useMemo(
    () => [
      {
        accessorKey: "attachment_file_name",
        header: "File Name",
        cell: ({ row }) => (
          <a
            href={row.original.file_url}
            target="_blank"
            className="text-blue-600 underline"
          >
            {row.original.attachment_file_name}
          </a>
        ),
      },
      {
        accessorKey: "is_processed",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.is_processed ? "default" : "secondary"}>
            {row.original.is_processed ? "Processed" : "Pending"}
          </Badge>
        ),
      },
    //   {
    //     accessorKey: "confidence",
    //     header: "Confidence",
    //     cell: ({ row }) => (
    //       <Badge
    //         variant={
    //           row.original.confidence === "high"
    //             ? "default"
    //             : row.original.confidence === "medium"
    //             ? "secondary"
    //             : "destructive"
    //         }
    //       >
    //         {row.original.confidence}
    //       </Badge>
    //     ),
    //   },
      {
        accessorKey: "ingested_at",
        header: "Uploaded",
        cell: ({ row }) =>
          new Date(row.original.ingested_at).toLocaleString(),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDelete(row.original)}
          >
            <Trash className="w-4 h-4" />
          </Button>
        ),
      },
    ],
    [handleDelete]
  );

  // -------------------------------
  // UI
  // -------------------------------
  return (
    <div className="w-full h-full p-6 space-y-6">
      {/* Upload Section */}
      <Card className="shadow-sm border rounded-xl">
        <CardHeader>
          <CardTitle>Upload COA Files</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <Input
            type="file"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
          />

          <Button onClick={onUpload} disabled={loading || files.length === 0}>
            <Upload className="w-4 h-4 mr-2" />
            {loading ? "Uploading..." : "Upload Files"}
          </Button>
        </CardContent>
      </Card>

      {/* Table Section */}
      <Card className="shadow-sm border rounded-xl">
        <CardHeader>
          <CardTitle>Uploaded Files</CardTitle>
        </CardHeader>

        <CardContent>
          <DataTable columns={columns} data={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
