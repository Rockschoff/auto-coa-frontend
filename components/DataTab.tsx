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
  is_imputed boolean false
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



*/
/* eslint-disable @typescript-eslint/no-explicit-any */
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FileDown, Info, Search } from "lucide-react";
import * as XLSX from "xlsx";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Helper component for the Imputed tooltip
const ImputedCell = ({ isImputed }: { isImputed: boolean }) => {
  if (!isImputed) {
    return null; // Render nothing if not imputed
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* We add a button for accessibility, but style it to be invisible */}
        <button
          type="button"
          className="flex items-center justify-center rounded-full"
          aria-label="Imputed value"
        >
          <Info className="h-4 w-4 text-blue-500" />
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p className="max-w-xs">
          Values in this column were inferred from industry standards. Please verify them against the source documents.
        </p>
      </TooltipContent>
    </Tooltip>
  );
};

export default function DataTab({
  organization_id,
}: {
  organization_id: string;
}) {
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
          attachment_file_name:
            row.attachments_read?.attachment_file_name ?? null,
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

  // Define column classes for width control
  const commonCellStyles = "max-w-[200px] truncate";
  const narrowCellStyles = "max-w-[100px] truncate";

  // New column count for the empty state (11 original columns + 1 new column = 12 total)
  const columnCount = 12;

  return (
    // TooltipProvider is needed for the tooltips to work
    <TooltipProvider>
      {/* The Card component itself is typically padded (via its parent layout/m-4).
        We'll focus on controlling the space inside it.
      */}
      <Card className="m-4">
        
        <CardHeader 
          className="sticky top-0 z-10 bg-background border-b"
        >
          {/* Apply vertical padding only here, not on the CardHeader itself */}
          <div className="pt-6 pb-2"> 
            <CardTitle>Certificate of Analysis Data</CardTitle>
            <CardDescription>
              View, filter, and export all COA data for this organization.
            </CardDescription>
          </div>

          {/* Search and Excel Button */}
          <div className="flex items-center justify-between gap-4 pb-4">
            <div className="relative w-1/3 min-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search all columns…"
                className="pl-9" // Add padding for the icon
                value={filterText}
                onChange={(e) => handleFilter(e.target.value)}
              />
            </div>

            <Button onClick={downloadExcel} variant="outline">
              <FileDown className="h-4 w-4 mr-2" />
              Download Excel
            </Button>
          </div>
        </CardHeader>
        
        {/* TASK FIX: Remove padding from CardContent (p-0) and 
          apply the actual scroll to the inner div to ensure the sticky header 
          correctly covers the scrollable content.
        */}
        <CardContent className="p-0">
          {/* Table Container - Added vertical padding (py-4), fixed height (h-[70vh]), and scroll (overflow-y-auto) */}
          <div className="px-6 pb-4 overflow-x-auto h-[70vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {/* The TableHead cells also need to be sticky to stay with the CardHeader/Filters */}
                  <TableHead className={`${narrowCellStyles} sticky top-0 bg-background z-[5]`}>
                    Doc Quality
                  </TableHead>
                  <TableHead className={`${narrowCellStyles} sticky top-0 bg-background z-[5]`}>Result</TableHead>
                  <TableHead className={`${commonCellStyles} sticky top-0 bg-background z-[5]`}>Product</TableHead>
                  <TableHead className={`${commonCellStyles} sticky top-0 bg-background z-[5]`}>Test</TableHead>
                  <TableHead className={`${commonCellStyles} sticky top-0 bg-background z-[5]`}>Sender</TableHead>
                  <TableHead className={`${commonCellStyles} sticky top-0 bg-background z-[5]`}>Specs</TableHead>
                  <TableHead className={`${commonCellStyles} sticky top-0 bg-background z-[5]`}>Value</TableHead>
                  <TableHead className={`${commonCellStyles} sticky top-0 bg-background z-[5]`}>Comments</TableHead>
                  <TableHead className={`sticky top-0 bg-background z-[5]`}>Date</TableHead>
                  <TableHead className={`sticky top-0 bg-background z-[5]`}>Document</TableHead>
                  <TableHead className={`w-[50px] sticky top-0 bg-background z-[5]`}>Imputed</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.length > 0 ? (
                  filtered.map((row) => (
                    <TableRow key={row.id} className="hover:bg-muted/50">
                      <TableCell className={narrowCellStyles}>
                        {row.confidence}
                      </TableCell>

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

                      <TableCell className={commonCellStyles}>
                        {row.product_name}
                      </TableCell>
                      <TableCell className={commonCellStyles}>
                        {row.test_name}
                      </TableCell>

                      <TableCell className={commonCellStyles}>
                        {row.sender_name}
                      </TableCell>

                      <TableCell className={commonCellStyles}>
                        {row.test_specs}
                      </TableCell>
                      <TableCell className={commonCellStyles}>
                        {row.test_value}
                      </TableCell>
                      <TableCell className={commonCellStyles}>
                        {row.test_comments}
                      </TableCell>

                      <TableCell>{row.coa_date ?? ""}</TableCell>

                      {/* Document Link */}
                      <TableCell>
                        {row.attachment_url ? (
                          <a
                            href={row.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline hover:text-blue-800"
                          >
                            {row.attachment_file_name || "View"}
                          </a>
                        ) : (
                          <span className="text-gray-400">No File</span>
                        )}
                      </TableCell>

                      {/* TASK: Added "is_imputed" cell with tooltip */}
                      <TableCell>
                        <ImputedCell isImputed={row.is_imputed} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  // Improved empty state
                  <TableRow>
                    <TableCell
                      colSpan={columnCount} 
                      className="h-24 text-center"
                    >
                      {rows.length > 0
                        ? "No results found for your search."
                        : "No data found for this organization."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}