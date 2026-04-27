"use client";

export function Modal({
  title,
  open,
  onClose,
  children
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-ink/35 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-lg bg-white shadow-soft sm:max-w-3xl sm:rounded-lg">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-line bg-white px-5 py-4">
          <h3 className="text-lg font-semibold text-ink">{title}</h3>
          <button className="btn-secondary min-h-9 px-3" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
