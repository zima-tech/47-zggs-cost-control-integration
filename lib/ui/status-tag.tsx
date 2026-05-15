"use client";

import { Tag, type TagProps } from "antd";
import type { ReactNode } from "react";

type StatusTagProps = Omit<TagProps, "variant" | "styles"> & {
  children: ReactNode;
};

const baseStatusTagStyles = {
  root: {
    border: "none",
    fontWeight: 400,
  },
};

export function StatusTag({ styles, ...props }: StatusTagProps) {
  return (
    <Tag
      variant="solid"
      styles={{
        ...baseStatusTagStyles,
        ...styles,
        root: {
          ...baseStatusTagStyles.root,
          ...styles?.root,
        },
      }}
      {...props}
    />
  );
}
