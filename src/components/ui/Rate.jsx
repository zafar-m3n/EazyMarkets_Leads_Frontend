import React, { useState } from "react";
import Icon from "@/components/ui/Icon";

const Rate = ({ value = 0, count = 5, onChange = () => {}, allowHalf = false, interactive = false, size = 24 }) => {
  const [hoverValue, setHoverValue] = useState(0);

  const getStarType = (index) => {
    if (hoverValue && interactive) {
      return index <= hoverValue ? "full" : "empty";
    }
    if (interactive) {
      return index <= value ? "full" : "empty";
    }
    const intPart = Math.floor(value);
    if (index <= intPart) return "full";
    if (allowHalf && index === intPart + 1 && value % 1 >= 0.5) return "half";
    return "empty";
  };

  const handleMouseEnter = (index) => {
    if (interactive) setHoverValue(index);
  };

  const handleMouseLeave = () => {
    if (interactive) setHoverValue(0);
  };

  const handleClick = (index) => {
    if (interactive) onChange(Math.ceil(index));
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= count; i++) {
      const starType = getStarType(i);
      stars.push(
        <span
          key={i}
          className={`cursor-${interactive ? "pointer" : "default"}`}
          onMouseEnter={() => handleMouseEnter(i)}
          onMouseLeave={handleMouseLeave}
          onClick={() => handleClick(i)}
        >
          {starType === "full" ? (
            <Icon icon="material-symbols:star" className="text-yellow-500" width={size} />
          ) : starType === "half" ? (
            <Icon icon="material-symbols:star-half" className="text-yellow-500" width={size} />
          ) : (
            <Icon icon="material-symbols:star" className="text-gray-300" width={size} />
          )}
        </span>
      );
    }
    return stars;
  };

  return <div className="flex">{renderStars()}</div>;
};

export default Rate;
