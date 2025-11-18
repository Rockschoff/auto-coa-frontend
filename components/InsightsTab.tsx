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

<TASK> : Axis ticks , Titles , labels should not overlap on the graphs here please fix that

*/
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

// --- (Imports are unchanged) ---
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ResponsiveLine } from "@nivo/line";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
import { AlertCircle } from "lucide-react";
import { format, parseISO, startOfMonth } from "date-fns";

// --- (Supabase Client, Types, and Chart Helpers are unchanged) ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type CoaDataRow = {
  id: string;
  sender_name: string | null;
  product_name: string | null;
  test_name: string | null;
  test_result: "pass" | "fail" | "unknown" | null;
  coa_date: string | null;
};

type SelectOption = {
  label: string;
  value: string;
};

// ... (All chart helper functions like processFailuresBySupplier are unchanged) ...
// 1. Failures by Supplier (Recharts Bar Chart)
const processFailuresBySupplier = (data: CoaDataRow[]) => {
  const failures = new Map<string, number>();

  data.forEach((row) => {
    if (row.test_result === "fail") {
      const supplier = row.sender_name || "Unknown Supplier";
      failures.set(supplier, (failures.get(supplier) || 0) + 1);
    }
  });

  return Array.from(failures.entries())
    .map(([name, failures]) => ({ name, failures }))
    .sort((a, b) => b.failures - a.failures); // Sort descending
};

// 2. Results by Product (Recharts Stacked Bar)
const processResultsByProduct = (data: CoaDataRow[]) => {
  const products = new Map<string, { pass: number; fail: number; unknown: number }>();

  data.forEach((row) => {
    const product = row.product_name || "Unknown Product";
    if (!products.has(product)) {
      products.set(product, { pass: 0, fail: 0, unknown: 0 });
    }
    const stats = products.get(product)!;
    if (row.test_result === "pass") stats.pass++;
    else if (row.test_result === "fail") stats.fail++;
    else stats.unknown++;
  });

  return Array.from(products.entries()).map(([name, counts]) => ({
    name,
    ...counts,
  }));
};

// 3. Failure Trend Over Time (Nivo Line Chart)
const processFailureTrend = (data: CoaDataRow[]) => {
  const failuresByMonth = new Map<string, number>();

  data.forEach((row) => {
    if (row.test_result === "fail" && row.coa_date) {
      try {
        const month = startOfMonth(parseISO(row.coa_date));
        const monthKey = format(month, "yyyy-MM-dd"); // Use ISO string for sorting
        failuresByMonth.set(monthKey, (failuresByMonth.get(monthKey) || 0) + 1);
      } catch (e) {
        console.error("Invalid date format:", row.coa_date);
      }
    }
  });

  if (failuresByMonth.size === 0) return [];

  const chartData = Array.from(failuresByMonth.entries())
    .map(([monthKey, count]) => ({
      x: format(parseISO(monthKey), "MMM yyyy"), // Format for display
      y: count,
      iso: monthKey,
    }))
    .sort((a, b) => a.iso.localeCompare(b.iso)); // Sort by date

  return [{ id: "Failures", data: chartData.map(d => ({ x: d.x, y: d.y })) }];
};
// Helper component for "No Data" message
  const NoDataMessage = ({ message }: { message: string }) => (
    <div className="h-full flex items-center justify-center text-gray-500">
      {message}
    </div>
  );
// -------------------------------
// Main Component
// -------------------------------
export default function InsightsTab({
  organization_id,
}: {
  organization_id: string;
}) {
  // Raw data
  const [allData, setAllData] = useState<CoaDataRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected filter values (User's *intent*)
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);

  // -------------------------------
  // 1. Fetch All Data (Unchanged)
  // -------------------------------
  useEffect(() => {
    async function loadData() {
      // ... (same as before) ...
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("coa_data")
        .select(
          "id, sender_name, product_name, test_name, test_result, coa_date"
        )
        .eq("organization_id", organization_id);

      if (error) {
        setError(error.message);
      } else if (data) {
        setAllData(data);
      }
      setIsLoading(false);
    }

    if (organization_id) {
      loadData();
    }
  }, [organization_id]);

  // -------------------------------
  // 2. Derive Supplier Options (Unchanged)
  // -------------------------------
  const supplierOptions = useMemo(() => {
    const suppliers = new Set(
      allData.map((row) => row.sender_name || "Unknown Supplier")
    );
    return Array.from(suppliers)
      .sort()
      .map((s) => ({ label: s, value: s }));
  }, [allData]);

  // -------------------------------
  // 3. Derive Test Options (Unchanged)
  // -------------------------------
  const testOptions = useMemo(() => {
    const supplierFilteredData =
      selectedSuppliers.length === 0
        ? allData
        : allData.filter((row) =>
            selectedSuppliers.includes(row.sender_name || "Unknown Supplier")
          );

    const tests = new Set(
      supplierFilteredData.map((row) => row.test_name || "Unknown Test")
    );
    return Array.from(tests)
      .sort()
      .map((t) => ({ label: t, value: t }));
  }, [allData, selectedSuppliers]);

  // -------------------------------
  // 3b. (NEW) Derive the *valid* selected tests
  // -------------------------------
  const validSelectedTests = useMemo(() => {
    const availableTestValues = new Set(testOptions.map((opt) => opt.value));
    return selectedTests.filter((test) => availableTestValues.has(test));
  }, [selectedTests, testOptions]);

  // -------------------------------
  // 4. Derive Filtered Data for Charts
  // -------------------------------
  const filteredData = useMemo(() => {
    return allData.filter((row) => {
      const supplierMatch =
        selectedSuppliers.length === 0 ||
        selectedSuppliers.includes(row.sender_name || "Unknown Supplier");
      
      // (CHANGED) Use validSelectedTests here
      const testMatch =
        validSelectedTests.length === 0 ||
        validSelectedTests.includes(row.test_name || "Unknown Test");
        
      return supplierMatch && testMatch;
    });
    // (CHANGED) Dependency array updated
  }, [allData, selectedSuppliers, validSelectedTests]);

  // -------------------------------
  // 5. Memoize Processed Chart Data (Unchanged)
  // -------------------------------
  const failuresBySupplierData = useMemo(
    () => processFailuresBySupplier(filteredData),
    [filteredData]
  );
  const resultsByProductData = useMemo(
    () => processResultsByProduct(filteredData),
    [filteredData]
  );
  const failureTrendData = useMemo(
    () => processFailureTrend(filteredData),
    [filteredData]
  );

  // Helper to determine max Y value for integer ticks
  const maxFailures = failuresBySupplierData.reduce(
    (max, item) => Math.max(max, item.failures),
    0
  );
  
  const maxResults = resultsByProductData.reduce((max, item) => 
    Math.max(max, item.pass + item.fail + item.unknown),
    0
  );

  

  // -------------------------------
  // Render Logic (Unchanged... except for one prop)
  // -------------------------------
  if (isLoading) {
    // ... (same as before) ...
    return <div className="p-8 text-center">Loading insights...</div>;
  }

  if (error) {
    // ... (same as before) ...
     return (
      <div className="p-8 text-center text-red-600">
        <AlertCircle className="mx-auto h-8 w-8 mb-2" />
        <strong>Error:</strong> {error}
      </div>
    );
  }

  if (allData.length === 0) {
    // ... (same as before) ...
    return (
      <div className="p-8 text-center text-gray-500">
        No data found for this organization to generate insights.
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 w-full h-full overflow-y-scroll">
      {/* --- Filter Bar --- */}
      <div className="text-4xl heading-font text-black flex justify-center items-center"><img src="logoshield.svg" width={50} height={50}/><span>Clear-COA</span></div>
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Select suppliers and tests to refine the visualizations below.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-4">
          <MultiSelectDropdown
            options={supplierOptions}
            selected={selectedSuppliers}
            onChange={setSelectedSuppliers}
            triggerLabel="Supplier"
          />
          <MultiSelectDropdown
            options={testOptions}
            // (CHANGED) Pass validSelectedTests to the 'selected' prop
            selected={validSelectedTests} 
            onChange={setSelectedTests}
            triggerLabel="Test"
          />
        </CardContent>
      </Card>

      {/* --- Charts Grid (Unchanged) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* --- Chart 1: Failures by Supplier (Recharts) --- */}
        <Card>
          <CardHeader>
            <CardTitle>Failures by Supplier</CardTitle>
            <CardDescription>
              Total Fail results for the selected suppliers and tests.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            {failuresBySupplierData.length === 0 ? (
              <NoDataMessage message="0 failures reported for the selected filters." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={failuresBySupplierData}
                  layout="vertical"
                  margin={{ right: 30, left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  {/* X-Axis (Failures Count) - Use floor/ceil to ensure integer ticks */}
                  <XAxis 
                    type="number" 
                    label={{ value: 'Count of Failures', position: 'bottom', dy: 4 }}
                    // Force domain to include the max value and tick count to be integer
                    domain={[0, Math.ceil(maxFailures) || 1]}
                    tickCount={Math.ceil(maxFailures) + 1}
                    // Force ticks to be integers
                    tickFormatter={(tick) => String(Math.floor(tick))}
                  />
                  {/* Y-Axis (Supplier) */}
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={150} 
                    label={{ value: 'Supplier Name', angle: -90, position: 'left', dx: -5 }}
                  />
                  <Tooltip wrapperClassName="rounded-md border bg-background p-2 shadow-sm" />
                  <Legend 
                    align="center"
                    verticalAlign="top"
                    height={36} // Give it enough vertical space
                  />
                  <Bar dataKey="failures" fill="#ef4444" name="Failures" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* --- Chart 2: Test Results by Product (Recharts) --- */}
        <Card>
          <CardHeader>
            <CardTitle>Results by Product</CardTitle>
            <CardDescription>
              Pass/Fail/Unknown breakdown by product name.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            {resultsByProductData.length === 0 ? (
              <NoDataMessage message="No test results reported for the selected filters." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={resultsByProductData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  {/* X-Axis (Product) */}
                  <XAxis 
                    dataKey="name" 
                    label={{ value: 'Product Name', position: 'bottom', dy: 4 }}
                  />
                  {/* Y-Axis (Count) - Use floor/ceil to ensure integer ticks */}
                  <YAxis 
                    label={{ value: 'Count of Results', angle: -90, position: 'left', dx: 0 }}
                    // Force domain to include the max value and tick count to be integer
                    domain={[0, Math.ceil(maxResults) || 1]}
                    tickCount={Math.ceil(maxResults) + 1}
                    // Force ticks to be integers
                    tickFormatter={(tick) => String(Math.floor(tick))}
                  />
                  <Tooltip wrapperClassName="rounded-md border bg-background p-2 shadow-sm" />
                  <Legend 
                    align="center"
                    verticalAlign="top"
                    height={36} // Give it enough vertical space
                  />
                  <Bar dataKey="pass" stackId="a" fill="#22c55e" name="Pass" />
                  <Bar dataKey="fail" stackId="a" fill="#ef4444" name="Fail" />
                  <Bar dataKey="unknown" stackId="a" fill="#6b7280" name="Unknown" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* --- Chart 3: Failure Trend (Nivo) --- */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Failure Trend Over Time</CardTitle>
            <CardDescription>
              Monthly count of Fail results over time.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            {/* Check if there's any data point at all */}
            {failureTrendData.length === 0 || failureTrendData[0].data.length === 0 ? (
              <NoDataMessage message="0 failures reported over time for the selected filters." />
            ) : (
              <ResponsiveLine
                data={failureTrendData}
                margin={{ top: 20, right: 60, bottom: 50, left: 60 }}
                xScale={{ type: "point" }}
                yScale={{
                  type: "linear",
                  min: 0, // Set min to 0
                  max: "auto",
                  stacked: false,
                  reverse: false,
                }}
                axisTop={null}
                axisRight={null}
                axisBottom={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: "Month", // Axis Title
                  legendOffset: 36,
                  legendPosition: "middle",
                }}
                axisLeft={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: "Count of Failures", // Axis Title
                  legendOffset: -40,
                  legendPosition: "middle",
                  // Force ticks to be integers
                  format: (value) => Math.floor(value) === value ? value : '', 
                  // Use a fixed tick value count to prevent fractional ticks, 
                  // as Nivo doesn't have a simple `tickFormatter` on its own axisLeft.
                  // Setting a high tick values count works well for common integer ranges.
                  tickValues: 10, 
                }}
                colors={["#ef4444"]}
                pointSize={10}
                pointColor={{ theme: "background" }}
                pointBorderWidth={2}
                pointBorderColor={{ from: "serieColor" }}
                pointLabelYOffset={-12}
                useMesh={true}
                legends={[
                  {
                    anchor: "bottom-right",
                    direction: "column",
                    justify: false,
                    translateX: 100,
                    translateY: 0,
                    itemsSpacing: 0,
                    itemDirection: "left-to-right",
                    itemWidth: 80,
                    itemHeight: 20,
                    itemOpacity: 0.75,
                    symbolSize: 12,
                    symbolShape: "circle",
                  },
                ]}
                theme={{
                  tooltip: {
                    container: {
                      background: "hsl(var(--background))",
                      color: "hsl(var(--foreground))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.375rem", // "rounded-md"
                    },
                  },
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}