// src/pages/admin/leads/LeadsImport.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import DefaultLayout from "@/layouts/DefaultLayout";
import API from "@/services/index";
import Notification from "@/components/ui/Notification";
import AccentButton from "@/components/ui/AccentButton";
import GrayButton from "@/components/ui/GrayButton";
import Icon from "@/components/ui/Icon";
import Heading from "@/components/ui/Heading";
import Select from "@/components/form/Select";
import TextInput from "@/components/form/TextInput";
import Papa from "papaparse";

const OTHER_SOURCE_VALUE = "__other__";

const LeadsImport = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [schema, setSchema] = useState(null);
  const [schemaLoading, setSchemaLoading] = useState(false);

  const [sourceOptions, setSourceOptions] = useState([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);

  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [parseError, setParseError] = useState("");

  const [selectedFallbackSource, setSelectedFallbackSource] = useState("");
  const [otherFallbackSource, setOtherFallbackSource] = useState("");

  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const [redirectIn, setRedirectIn] = useState(5);

  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const fetchSchema = async () => {
      setSchemaLoading(true);
      try {
        const res = await API.private.getLeadTemplateSchema();
        setSchema(res.data);
      } catch {
        Notification.error("Failed to load template");
      } finally {
        setSchemaLoading(false);
      }
    };

    const fetchSources = async () => {
      setSourcesLoading(true);
      try {
        const res = await API.private.getLeadSources();

        const rawSources = res?.data?.data || res?.data?.sources || res?.data || [];

        const mapped = Array.isArray(rawSources)
          ? rawSources
              .map((src) => ({
                value: src.value || src.label || "",
                label: src.label || src.value || "",
              }))
              .filter((src) => src.value && src.label)
          : [];

        const uniqueMap = new Map();
        mapped.forEach((item) => {
          if (!uniqueMap.has(item.value)) {
            uniqueMap.set(item.value, item);
          }
        });

        const finalOptions = [
          ...Array.from(uniqueMap.values()).sort((a, b) => a.label.localeCompare(b.label)),
          { value: OTHER_SOURCE_VALUE, label: "Other" },
        ];

        setSourceOptions(finalOptions);
      } catch {
        Notification.error("Failed to load sources");
        setSourceOptions([{ value: OTHER_SOURCE_VALUE, label: "Other" }]);
      } finally {
        setSourcesLoading(false);
      }
    };

    fetchSchema();
    fetchSources();
  }, []);

  useEffect(() => {
    if (!result?.success) return;

    setRedirectIn(5);

    const interval = setInterval(() => {
      setRedirectIn((s) => (s > 1 ? s - 1 : 0));
    }, 1000);

    const timeout = setTimeout(() => {
      navigate("/admin/leads");
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [result?.success, navigate]);

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const onDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const f = e.dataTransfer.files[0];
      await handleFileSelected(f);
      e.dataTransfer.clearData();
    }
  };

  const handleFilePick = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    await handleFileSelected(f);
  };

  const handleFileSelected = async (f) => {
    setFile(f);
    setParseError("");
    setRows([]);
    setResult(null);

    const name = f.name.toLowerCase();
    if (!name.endsWith(".csv")) {
      setParseError("Only .csv files are supported.");
      return;
    }

    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (res) => {
        const data = res?.data || [];
        setRows(data);
      },
      error: () => {
        setParseError("Failed to parse CSV file.");
      },
    });
  };

  const previewRows = useMemo(() => rows.slice(0, 5), [rows]);

  const previewHeaders = useMemo(() => {
    if (previewRows.length === 0) return [];

    const set = new Set();
    previewRows.forEach((r) => Object.keys(r).forEach((k) => set.add(k)));

    const schemaOrder = schema?.fields || [];

    return [...schemaOrder.filter((f) => set.has(f)), ...Array.from(set).filter((k) => !schemaOrder.includes(k))];
  }, [previewRows, schema]);

  const resolvedFallbackSource = useMemo(() => {
    if (selectedFallbackSource === OTHER_SOURCE_VALUE) {
      return otherFallbackSource.trim();
    }
    return selectedFallbackSource.trim();
  }, [selectedFallbackSource, otherFallbackSource]);

  const handleImport = async () => {
    if (rows.length === 0) {
      Notification.error("No rows parsed. Upload a valid CSV first.");
      return;
    }

    if (selectedFallbackSource === OTHER_SOURCE_VALUE && !otherFallbackSource.trim()) {
      Notification.error("Please enter a source name.");
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      const payload = {
        leads: rows,
        fallback_source: resolvedFallbackSource || undefined,
      };

      const res = await API.private.importLeads(payload);

      if (res.data?.success) {
        Notification.success(res.data.message || "Leads imported successfully");
        setResult(res.data);
      } else {
        Notification.error(res.data?.error || "Import failed");
        setResult(res.data);
      }
    } catch (err) {
      Notification.error(err.response?.data?.error || "Import failed");
      setResult({
        success: false,
        error: err.response?.data?.error || "Import failed",
        details: err.response?.data?.details || null,
      });
    } finally {
      setImporting(false);
    }
  };

  const handleCancel = () => {
    navigate("/admin/leads");
  };

  const handleDownloadTemplate = () => {
    if (!schema?.fields) return;

    const headers = schema.fields;
    const sample = headers.map((h) => {
      if (h === "status") return schema.defaults?.status ?? "New";
      if (h === "source") return "";
      return "";
    });

    const csv = [headers.join(","), sample.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "leads_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  return (
    <DefaultLayout>
      <div className="space-y-6">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-2">
              <Heading>Import Leads</Heading>
              <p className="max-w-2xl text-sm text-gray-600">
                Upload your CSV file, review the preview, then import your leads.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="w-fit">
                <GrayButton text="Cancel" onClick={handleCancel} />
              </div>
              <div className="w-fit">
                <AccentButton
                  text={importing ? "Importing..." : "Import Leads"}
                  onClick={handleImport}
                  disabled={importing || rows.length === 0}
                />
              </div>
            </div>
          </div>
        </div>

        {result && (
          <div
            className={`rounded-3xl border p-5 shadow-sm ${
              result.success ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {result.success ? (
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <Icon icon="mdi:check-circle-outline" width={22} />
                </div>

                <div className="flex-1">
                  <p className="font-medium">{result.message || "Import completed."}</p>

                  {result.summary && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-green-200 bg-white/80 p-4">
                        <p className="text-xs uppercase tracking-wide text-green-700">Attempted</p>
                        <p className="mt-1 text-xl font-semibold">{result.summary.attempted}</p>
                      </div>
                      <div className="rounded-2xl border border-green-200 bg-white/80 p-4">
                        <p className="text-xs uppercase tracking-wide text-green-700">Imported</p>
                        <p className="mt-1 text-xl font-semibold">{result.summary.inserted}</p>
                      </div>
                      <div className="rounded-2xl border border-green-200 bg-white/80 p-4">
                        <p className="text-xs uppercase tracking-wide text-green-700">Skipped</p>
                        <p className="mt-1 text-xl font-semibold">{result.summary.duplicates_or_skipped}</p>
                      </div>
                    </div>
                  )}

                  {!!(result.notes && result.notes.length) && (
                    <div className="mt-4">
                      <p className="font-medium">Import Notes</p>
                      <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                        {result.notes.map((n, idx) => (
                          <li key={idx}>
                            Row {n.index + 1}:{" "}
                            {n.email ? (
                              <>
                                <span className="font-mono">{n.email}</span>
                                <span className="opacity-70"> – </span>
                              </>
                            ) : n.phone ? (
                              <>
                                <span className="font-mono">{n.phone}</span>
                                <span className="opacity-70"> – </span>
                              </>
                            ) : null}
                            {n.note}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <p className="text-sm">
                      Redirecting to <span className="font-semibold">Leads</span> in{" "}
                      <span className="font-semibold">{redirectIn}</span>s
                    </p>
                    <div className="w-fit">
                      <AccentButton text="Go to Leads now" onClick={() => navigate("/admin/leads")} />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <Icon icon="mdi:alert-circle-outline" width={22} />
                </div>

                <div className="flex-1">
                  <p className="font-medium">Import failed</p>
                  <p className="mt-1 text-sm">{result.error}</p>

                  {result.details?.notes && result.details.notes.length > 0 && (
                    <div className="mt-4">
                      <p className="font-medium">Details</p>
                      <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                        {result.details.notes.map((n, idx) => (
                          <li key={idx}>
                            Row {n.index + 1}:{" "}
                            {n.email ? (
                              <>
                                <span className="font-mono">{n.email}</span>
                                <span className="opacity-70"> – </span>
                              </>
                            ) : n.phone ? (
                              <>
                                <span className="font-mono">{n.phone}</span>
                                <span className="opacity-70"> – </span>
                              </>
                            ) : null}
                            {n.note}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
          <div className="space-y-6">
            <div
              className={`rounded-3xl border-2 border-dashed bg-white p-8 shadow-sm transition ${
                isDragging ? "border-black" : "border-gray-300"
              }`}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
            >
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFilePick} />

              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50">
                  <Icon icon="mdi:file-delimited-outline" width={28} />
                </div>

                <h2 className="text-lg font-semibold text-gray-900">Upload CSV File</h2>
                <p className="mt-2 max-w-md text-sm text-gray-600">
                  Drag and drop your file here or choose it from your device.
                </p>

                <div className="mt-5 w-fit">
                  <AccentButton text="Choose File" onClick={() => fileInputRef.current?.click()} />
                </div>

                {file && (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700">
                    <Icon icon="mdi:file-outline" width={18} />
                    <span className="font-medium">{file.name}</span>
                  </div>
                )}

                {parseError && <p className="mt-3 text-sm text-red-600">{parseError}</p>}
              </div>
            </div>

            {rows.length > 0 && (
              <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Preview</h3>
                    <p className="text-sm text-gray-600">First 5 rows from the uploaded file</p>
                  </div>

                  <div className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-700">
                    Parsed <span className="font-semibold">{rows.length}</span> rows
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        {previewHeaders.map((h) => (
                          <th key={h} className="px-4 py-3 text-left font-medium text-gray-700">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((r, i) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                          {previewHeaders.map((h) => (
                            <td key={h} className="whitespace-pre-wrap px-4 py-3 align-top text-gray-800">
                              {String(r[h] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 px-5 py-4">
                  <div className="w-fit">
                    <GrayButton text="Cancel" onClick={handleCancel} />
                  </div>
                  <div className="w-fit">
                    <AccentButton
                      text={importing ? "Importing..." : "Import Leads"}
                      onClick={handleImport}
                      disabled={importing || rows.length === 0}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50">
                  <Icon icon="mdi:tune-variant" width={20} />
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900">Import Settings</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Choose a source for leads that do not already have one in the file.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <Select
                  label="Fallback Source"
                  value={selectedFallbackSource}
                  onChange={(value) => {
                    setSelectedFallbackSource(value);
                    if (value !== OTHER_SOURCE_VALUE) {
                      setOtherFallbackSource("");
                    }
                  }}
                  options={sourceOptions}
                  placeholder={sourcesLoading ? "Loading sources..." : "Select source"}
                  isDisabled={sourcesLoading}
                />

                {selectedFallbackSource === OTHER_SOURCE_VALUE && (
                  <TextInput
                    label="Source Name"
                    placeholder="Enter source name"
                    value={otherFallbackSource}
                    onChange={(e) => setOtherFallbackSource(e.target.value)}
                  />
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50">
                  <Icon icon="mdi:file-document-outline" width={20} />
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900">CSV Template</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Download the template to make sure your file has the expected columns.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm text-gray-700">
                  Maximum recommended size: <span className="font-semibold">300 rows</span> per import.
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <div className="w-fit">
                  <AccentButton text="Download Template CSV" onClick={handleDownloadTemplate} />
                </div>
              </div>

              <div className="mt-5">
                {schemaLoading ? (
                  <p className="text-sm text-gray-500">Loading template...</p>
                ) : schema?.fields?.length ? (
                  <>
                    <p className="mb-3 text-sm font-medium text-gray-900">Included Columns</p>
                    <div className="flex flex-wrap gap-2">
                      {schema.fields.map((field) => (
                        <span
                          key={field}
                          className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700"
                        >
                          {field}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">No template available.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
};

export default LeadsImport;
