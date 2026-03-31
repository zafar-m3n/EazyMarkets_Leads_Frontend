import React from "react";
import SelectLib from "react-select";

const Select = ({ value, onChange, options = [], placeholder = "Select", error, label, ...rest }) => {
  const customStyles = {
    control: (base, state) => ({
      ...base,
      backgroundColor: "#fff",
      borderColor: error ? "#f87171" : state.isFocused ? "#7ed957" : "#d1d5db",
      boxShadow: "none",
      color: "#111827",
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: "#fff",
      color: "#111827",
      zIndex: 9999,
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 9999,
      fontFamily: "Manrope, sans-serif",
      fontSize: "0.875rem",
    }),
    singleValue: (base) => ({
      ...base,
      color: "#111827",
    }),
    option: (base, { isFocused }) => ({
      ...base,
      backgroundColor: isFocused ? "#7ed957" : "#fff",
      color: isFocused ? "#fff" : "#111827",
      cursor: "pointer",
    }),
    placeholder: (base) => ({
      ...base,
      color: "#6b7280",
    }),
  };

  return (
    <div className="w-full">
      {label && <label className="block mb-1 text-sm font-medium text-gray-800">{label}</label>}
      <SelectLib
        options={options}
        value={options.find((opt) => opt.value === value) || null}
        onChange={(selected) => onChange(selected?.value || "")}
        placeholder={placeholder}
        styles={customStyles}
        classNamePrefix="react-select"
        menuPortalTarget={document.body}
        classNames={{
          menuList: () => "app-scrollbar",
        }}
        {...rest}
      />
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

export default Select;
