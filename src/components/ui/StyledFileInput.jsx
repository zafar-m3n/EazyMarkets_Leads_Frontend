import React, { useRef } from "react";
import Icon from "@/components/ui/Icon";

const StyledFileInput = ({ label, file, filePath, onChange, onRemove, preferredSize = "" }) => {
  const fileInputRef = useRef();

  const handleRemove = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onRemove();
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {preferredSize && <span className="text-gray-400">({preferredSize})</span>}
      </label>

      <div className="flex border border-gray-300 bg-white rounded overflow-hidden focus-within:border-accent">
        <button
          type="button"
          onClick={() => fileInputRef.current.click()}
          className="bg-gray-100 px-4 py-2 text-sm hover:bg-gray-200 border-none rounded-none"
        >
          Choose File
        </button>

        <div className="flex items-center px-3 py-2 space-x-2 relative bg-white">
          {!file && !filePath ? (
            <span className="text-gray-500 text-sm">No file chosen</span>
          ) : file ? (
            <>
              <span className="text-xs truncate max-w-[150px] text-gray-700">{file.name}</span>
              <button type="button" onClick={handleRemove} className="text-gray-500 hover:text-gray-700">
                <Icon icon="mdi:close" width="16" />
              </button>
            </>
          ) : (
            <div className="relative">
              <img src={filePath} alt="Preview" className="w-12 h-12 object-cover rounded border border-gray-300" />
              <button type="button" onClick={handleRemove} className="absolute -top-3 -right-2">
                <Icon
                  icon="mdi:close"
                  width="16"
                  className="rounded-full p-0.5 shadow bg-white hover:bg-gray-100 text-gray-700"
                />
              </button>
            </div>
          )}
        </div>

        <input type="file" accept="image/*" ref={fileInputRef} onChange={onChange} className="hidden" />
      </div>
    </div>
  );
};

export default StyledFileInput;
