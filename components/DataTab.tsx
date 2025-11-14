/* eslint-disable @typescript-eslint/no-explicit-any */
/*
create table public.coa_data (
  id uuid not null default extensions.uuid_generate_v4 (),
  attachment_surrogate_key uuid null,
  organization_id uuid null,
  tenant_id text not null,
  coa_date date null,
  sender_name text null,
  product_name text null,
  test_name text null,
  test_result text null default 'unknown'::text,
  test_specs text null,
  test_value text null,
  test_comments text null,
  confidence text null default 'medium'::text,
  file_url text null,
  created_at timestamp with time zone null default now(),
  constraint coa_data_pkey primary key (id),
  constraint coa_data_attachment_surrogate_key_fkey foreign KEY (attachment_surrogate_key) references attachments_read (attachment_surrogate_key) on delete CASCADE,
  constraint coa_data_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE,
  constraint coa_data_confidence_check check (
    (
      confidence = any (array['high'::text, 'medium'::text, 'low'::text])
    )
  ),
  constraint coa_data_test_result_check check (
    (
      test_result = any (
        array['pass'::text, 'fail'::text, 'unknown'::text]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_coa_attachment on public.coa_data using btree (attachment_surrogate_key) TABLESPACE pg_default;

create index IF not exists idx_coa_product_test on public.coa_data using btree (product_name, test_name) TABLESPACE pg_default;

create index IF not exists idx_coa_tenant_date on public.coa_data using btree (tenant_id, coa_date) TABLESPACE pg_default;

i have to create this table display this table for the said organization id
use the supabase to get the data
shadch for ui
use  npx shadcn@latest add table
to show the table, table should look good and be filtertable and options to download the table in excel format
*/
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import * as XLSX from "xlsx";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DataTab({ organization_id }: { organization_id: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [filterText, setFilterText] = useState("");

  // -------------------------------
  // Fetch COA Data + Attachments
  // -------------------------------
  useEffect(() => {
    let isMounted = true;

    async function load() {
      const { data, error } = await supabase
        .from("coa_data")
        .select(
          `
          *,
          attachments_read:attachment_surrogate_key (
            file_url,
            attachment_file_name
          )
        `
        )
        .eq("organization_id", organization_id)
        .order("created_at", { ascending: false });

      if (!error && data && isMounted) {
        // Flatten nested join for easier table mapping
        const flattened = data.map((row) => ({
          ...row,
          attachment_url: row.attachments_read?.file_url ?? null,
          attachment_file_name: row.attachments_read?.attachment_file_name ?? null,
        }));

        setRows(flattened);
        setFiltered(flattened);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [organization_id]);

  // -------------------------------
  // Filtering
  // -------------------------------
  function handleFilter(text: string) {
    setFilterText(text);
    const f = rows.filter((row) =>
      Object.values(row).some((v) =>
        String(v ?? "")
          .toLowerCase()
          .includes(text.toLowerCase())
      )
    );
    setFiltered(f);
  }

  // -------------------------------
  // Excel Download
  // -------------------------------
  function downloadExcel() {
    const worksheet = XLSX.utils.json_to_sheet(filtered);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "COA Data");
    XLSX.writeFile(workbook, "coa_data.xlsx");
  }

  return (
    <div className="p-4 space-y-4">

      {/* Search and Excel Button */}
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Search all columns…"
          className="w-1/3"
          value={filterText}
          onChange={(e) => handleFilter(e.target.value)}
        />

        <Button onClick={downloadExcel}>Download Excel</Button>
      </div>

      {/* Table */}
      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Test</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Specs</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Comments</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Document</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filtered.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.product_name}</TableCell>
                <TableCell>{row.test_name}</TableCell>
                <TableCell
                  className={
                    row.test_result === "pass"
                      ? "text-green-600 font-medium"
                      : row.test_result === "fail"
                      ? "text-red-600 font-medium"
                      : "text-gray-500"
                  }
                >
                  {row.test_result}
                </TableCell>
                <TableCell>{row.test_specs}</TableCell>
                <TableCell>{row.test_value}</TableCell>
                <TableCell>{row.test_comments}</TableCell>
                <TableCell>{row.confidence}</TableCell>
                <TableCell>{row.coa_date ?? ""}</TableCell>

                {/* Document Link */}
                <TableCell>
                  {row.attachment_url ? (
                    <a
                      href={row.attachment_url}
                      target="_blank"
                      className="text-blue-600 underline"
                    >
                      {row.attachment_file_name || "View"}
                    </a>
                  ) : (
                    <span className="text-gray-400">No File</span>
                  )}
                </TableCell>

              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-gray-500">No data found for this organization.</p>
      )}
    </div>
  );
}
