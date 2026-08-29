"use client";

export function AutoSubmitSelect({
  name,
  defaultValue,
  options,
  placeholder,
}: {
  name: string;
  defaultValue: string;
  options: string[];
  placeholder: string;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      onChange={(e) => e.target.form?.requestSubmit()}
      className="rounded-lg border border-mist px-3 py-1.5 text-sm"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
