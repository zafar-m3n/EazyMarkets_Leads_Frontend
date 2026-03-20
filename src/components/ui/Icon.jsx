import React from "react";
import { Icon } from "@iconify/react";
const IconComponent = ({ icon, className, width, rotate, hFlip, vFlip }) => {
  return (
    <>
      <Icon
        width={width}
        rotate={rotate}
        hFlip={hFlip}
        icon={icon}
        className={className}
        vFlip={vFlip}
        style={{ display: "inline-block" }}
      />
    </>
  );
};

export default IconComponent;
