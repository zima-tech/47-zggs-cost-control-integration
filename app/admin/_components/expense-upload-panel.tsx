"use client";

import type { UploadProps } from "antd";
import { Alert, Upload } from "antd";

const { Dragger } = Upload;

type ExpenseUploadPanelProps = {
  alertDescription: string;
  alertMessage: string;
  extra?: React.ReactNode;
  summary: React.ReactNode;
  title: string;
  uploadDescription: string;
  uploadLabel: string;
  uploadProps: UploadProps;
  uppercaseLabel: string;
};

export function ExpenseUploadPanel({
  alertDescription,
  alertMessage,
  extra,
  summary,
  title,
  uploadDescription,
  uploadLabel,
  uploadProps,
  uppercaseLabel,
}: ExpenseUploadPanelProps) {
  return (
    <section className="admin-panel">
      <div className="flex flex-col gap-5">
        <div>
          <p className="admin-panel-kicker">{uppercaseLabel}</p>
          <h2 className="admin-panel-title">{title}</h2>
          <div className="admin-panel-description">{summary}</div>
        </div>

        <Alert
          type="info"
          showIcon
          title={alertMessage}
          description={alertDescription}
        />

        {extra}

        <Dragger {...uploadProps}>
          <p className="text-base font-semibold text-stone-900">
            {uploadLabel}
          </p>
          <p className="mt-2 text-sm text-stone-500">{uploadDescription}</p>
        </Dragger>
      </div>
    </section>
  );
}
