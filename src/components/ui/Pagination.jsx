import React, { useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";
import TextInput from "@/components/form/TextInput";

const DOTS = "DOTS";

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
  text = false,
  siblingCount = 1,
  boundaryCount = 1,
}) => {
  const [jumpValue, setJumpValue] = useState(String(currentPage));

  useEffect(() => {
    setJumpValue(String(currentPage));
  }, [currentPage]);

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  const range = (start, end) => {
    const out = [];
    for (let i = start; i <= end; i++) out.push(i);
    return out;
  };

  const getPageNumbers = () => {
    if (totalPages <= 1) return [1];

    const totalNumbers = boundaryCount * 2 + siblingCount * 2 + 3;
    if (totalPages <= totalNumbers) return range(1, totalPages);

    const leftSibling = Math.max(currentPage - siblingCount, boundaryCount + 2);
    const rightSibling = Math.min(currentPage + siblingCount, totalPages - boundaryCount - 1);

    const showLeftDots = leftSibling > boundaryCount + 2;
    const showRightDots = rightSibling < totalPages - boundaryCount - 1;

    const startPages = range(1, boundaryCount);
    const endPages = range(totalPages - boundaryCount + 1, totalPages);
    const middlePages = range(leftSibling, rightSibling);

    if (!showLeftDots && showRightDots) {
      const leftItemCount = boundaryCount + siblingCount * 2 + 2;
      const leftRange = range(1, leftItemCount);
      return [...leftRange, DOTS, ...endPages];
    }

    if (showLeftDots && !showRightDots) {
      const rightItemCount = boundaryCount + siblingCount * 2 + 2;
      const rightRange = range(totalPages - rightItemCount + 1, totalPages);
      return [...startPages, DOTS, ...rightRange];
    }

    return [...startPages, DOTS, ...middlePages, DOTS, ...endPages];
  };

  const handleClick = (page) => {
    if (page === DOTS) return;
    const nextPage = clamp(page, 1, totalPages);
    if (nextPage !== currentPage) onPageChange(nextPage);
  };

  const submitJump = () => {
    const raw = jumpValue.trim();
    if (!raw) return;
    const n = Math.floor(Number(raw));
    if (!Number.isFinite(n)) return;
    handleClick(clamp(n, 1, totalPages));
  };

  const onJumpKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitJump();
    }
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className={`flex items-center justify-between w-full ${className}`}>
      {/* Left side: pagination numbers */}
      <div className="flex items-center space-x-1.5">
        <button
          onClick={() => handleClick(currentPage - 1)}
          disabled={currentPage <= 1}
          className={`flex items-center justify-center w-8 h-8 border rounded text-xs ${
            currentPage <= 1
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : text
              ? "bg-white hover:bg-gray-100 text-black"
              : "bg-black text-white"
          }`}
          aria-label="Previous page"
        >
          {text ? "Prev" : <Icon icon="heroicons:chevron-left" className="w-3 h-3" />}
        </button>

        {pageNumbers.map((item, idx) => {
          const isDots = item === DOTS;
          const isActive = item === currentPage;

          return (
            <button
              key={`${item}-${idx}`}
              onClick={() => handleClick(item)}
              disabled={isDots}
              className={`px-2 h-8 min-w-[2rem] border rounded text-xs flex items-center justify-center ${
                isDots
                  ? "cursor-not-allowed text-gray-400 bg-white"
                  : isActive
                  ? "font-semibold border-accent text-accent bg-accent/10"
                  : "text-gray-800 bg-white hover:bg-gray-100"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              {isDots ? "…" : item}
            </button>
          );
        })}

        <button
          onClick={() => handleClick(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={`flex items-center justify-center w-8 h-8 border rounded text-xs ${
            currentPage >= totalPages
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : text
              ? "bg-white hover:bg-gray-100 text-black"
              : "bg-black text-white"
          }`}
          aria-label="Next page"
        >
          {text ? "Next" : <Icon icon="heroicons:chevron-right" className="w-3 h-3" />}
        </button>
      </div>

      {/* Right side: go to page */}
      <div className="flex items-center space-x-1">
        <span className="text-xs text-gray-700">Go to</span>
        <div className="w-16">
          <TextInput
            aria-label="Go to page"
            type="number"
            placeholder="Page"
            value={jumpValue}
            min={1}
            max={totalPages}
            className="h-8 px-1.5 py-1 text-xs"
            onChange={(e) => {
              const v = e.target.value.replace(/[^\d]/g, "");
              setJumpValue(v);
            }}
            onKeyDown={onJumpKeyDown}
          />
        </div>
        <button
          onClick={submitJump}
          className="h-8 px-2 border rounded text-xs bg-black text-white hover:opacity-90"
          aria-label="Go to specified page"
        >
          Go
        </button>
        <span className="text-[10px] text-gray-500">/ {totalPages}</span>
      </div>
    </div>
  );
};

export default Pagination;
