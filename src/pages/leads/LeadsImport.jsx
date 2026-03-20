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
import Papa from "papaparse";

const LeadsImport = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Schema
  const [schema, setSchema] = useState(null);
  const [schemaLoading, setSchemaLoading] = useState(false);

  // File + parsed rows
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [parseError, setParseError] = useState("");

  // Import state
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null); // { success, summary, notes, message, data } or { success:false, error, details }

  // Redirect countdown
  const [redirectIn, setRedirectIn] = useState(5);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);

  // Fetch template schema
  useEffect(() => {
    const fetchSchema = async () => {
      setSchemaLoading(true);
      try {
        const res = await API.private.getLeadTemplateSchema();
        setSchema(res.data); // { fields, defaults, notes, ... }
      } catch {
        Notification.error("Failed to load template schema");
      } finally {
        setSchemaLoading(false);
      }
    };
    fetchSchema();
  }, []);

  // Start 5s redirect after a successful import
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

  // Drag & Drop handlers
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

    // Parse CSV with PapaParse
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

  // Preview headers from first few rows (union of keys for consistency)
  const previewRows = useMemo(() => rows.slice(0, 5), [rows]);
  const previewHeaders = useMemo(() => {
    if (previewRows.length === 0) return [];
    const set = new Set();
    previewRows.forEach((r) => Object.keys(r).forEach((k) => set.add(k)));
    // Put schema fields first if available (nicer ordering), then any extras
    const schemaOrder = schema?.fields || [];
    return [...schemaOrder.filter((f) => set.has(f)), ...Array.from(set).filter((k) => !schemaOrder.includes(k))];
  }, [previewRows, schema]);

  const handleImport = async () => {
    if (rows.length === 0) {
      Notification.error("No rows parsed. Upload a valid CSV first.");
      return;
    }
    setImporting(true);
    setResult(null);
    try {
      const res = await API.private.importLeads({ leads: rows });
      if (res.data?.success) {
        Notification.success(res.data.message || "Leads imported successfully");
        setResult(res.data); // show summary card (and auto-redirect effect kicks in)
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
    const sample = headers.map((h) =>
      h === "status" ? schema.defaults?.status ?? "new" : h === "source" ? schema.defaults?.source ?? "facebook" : ""
    );
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
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Heading>Import Leads</Heading>
          <div className="flex space-x-2">
            <div className="w-fit">
              <GrayButton text="Cancel" onClick={handleCancel} />
            </div>
            <div className="w-fit">
              <button
                onClick={handleImport}
                disabled={importing || rows.length === 0}
                className={`px-4 py-2 rounded bg-black text-white font-medium transition ${
                  importing || rows.length === 0 ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-900"
                }`}
              >
                {importing ? "Importing..." : "Import Leads"}
              </button>
            </div>
          </div>
        </div>

        {/* ===== Summary Card (ABOVE Schema) ===== */}
        {result && (
          <div
            className={`rounded-2xl p-4 ${
              result.success
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
          >
            {result.success ? (
              <>
                <p className="font-medium">{result.message || "Import completed."}</p>
                {result.summary && (
                  <p className="mt-1 text-sm">
                    Attempted: <strong>{result.summary.attempted}</strong> · Inserted:{" "}
                    <strong>{result.summary.inserted}</strong> · Duplicates/Skipped:{" "}
                    <strong>{result.summary.duplicates_or_skipped}</strong>
                  </p>
                )}

                {!!(result.notes && result.notes.length) && (
                  <div className="mt-3">
                    <p className="font-medium">Notes</p>
                    <ul className="mt-1 list-disc list-inside text-sm">
                      {result.notes.map((n, idx) => (
                        <li key={idx}>
                          Row {n.index + 1}:{" "}
                          {n.email ? (
                            <>
                              <span className="font-mono">{n.email}</span> <span className="opacity-70">– </span>
                            </>
                          ) : n.phone ? (
                            <>
                              <span className="font-mono">{n.phone}</span> <span className="opacity-70">– </span>
                            </>
                          ) : null}
                          {n.note}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Redirect hint */}
                <p className="mt-3 text-sm">
                  Redirecting to <span className="font-semibold">Leads</span> in{" "}
                  <span className="font-semibold">{redirectIn}</span>s…
                </p>

                <div className="mt-3 w-fit">
                  <AccentButton text="Go to Leads now" onClick={() => navigate("/admin/leads")} />
                </div>
              </>
            ) : (
              <>
                <p className="font-medium">Import failed</p>
                <p className="text-sm mt-1">{result.error}</p>
                {result.details?.notes && result.details.notes.length > 0 && (
                  <div className="mt-3">
                    <p className="font-medium">Details</p>
                    <ul className="mt-1 list-disc list-inside text-sm">
                      {result.details.notes.map((n, idx) => (
                        <li key={idx}>
                          Row {n.index + 1}:{" "}
                          {n.email ? (
                            <>
                              <span className="font-mono">{n.email}</span> <span className="opacity-70">– </span>
                            </>
                          ) : n.phone ? (
                            <>
                              <span className="font-mono">{n.phone}</span> <span className="opacity-70">– </span>
                            </>
                          ) : null}
                          {n.note}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Schema Card */}
        <div className="rounded-2xl border border-gray-200 p-4 bg-white shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Template Schema</h2>
            <div className="w-fit">
              <AccentButton text="Download Template CSV" onClick={handleDownloadTemplate} />
            </div>
          </div>
          <div
            className={`rounded-2xl p-4 bg-blue-50 border border-blue-200 text-blue-800 flex items-center mt-4 space-x-2`}
          >
            <Icon icon="mdi:info" />
            CSV File should not have more than&nbsp;<strong>300 rows</strong>&nbsp;at once to avoid timeouts.
          </div>
        </div>

        {/* Upload Box (CSV only) */}
        <div
          className={`border-2 border-dashed rounded-2xl p-8 bg-white transition ${
            isDragging ? "border-black" : "border-gray-300"
          }`}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
        >
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFilePick} />
          <div className="text-center">
            <p className="text-gray-800 font-medium">Drag & drop your CSV file here</p>
            <p className="text-sm text-gray-600 mt-1">
              or{" "}
              <button type="button" onClick={() => fileInputRef.current?.click()} className="underline text-gray-900">
                choose a file
              </button>
              .
            </p>
            {file && (
              <p className="mt-3 text-sm text-gray-700">
                Selected: <span className="font-medium">{file.name}</span>
              </p>
            )}
            {parseError && <p className="mt-3 text-sm text-red-600">{parseError}</p>}
          </div>
        </div>

        {/* Preview */}
        {rows.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Preview (first 5 rows)</h3>
              <p className="text-sm text-gray-600">
                Parsed <span className="font-semibold">{rows.length}</span> rows
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    {previewHeaders.map((h) => (
                      <th key={h} className="text-left px-4 py-2 font-medium text-gray-700">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((r, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/60"}>
                      {previewHeaders.map((h) => (
                        <td key={h} className="px-4 py-2 text-gray-800 whitespace-pre-wrap">
                          {String(r[h] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Import bar */}
            <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-2">
              <div className="w-fit">
                <GrayButton text="Cancel" onClick={handleCancel} />
              </div>
              <div className="w-fit">
                <button
                  onClick={handleImport}
                  disabled={importing || rows.length === 0}
                  className={`px-4 py-2 rounded bg-black text-white font-medium transition ${
                    importing || rows.length === 0 ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-900"
                  }`}
                >
                  {importing ? "Importing..." : "Import Leads"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DefaultLayout>
  );
};

export default LeadsImport;
