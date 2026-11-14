import type { ChangeEvent } from 'react';

export const PHONE_BRANDS = [
  'Apple', 'Samsung', 'Google', 'Xiaomi', 'Redmi', 'POCO', 'OnePlus',
  'OPPO', 'vivo', 'iQOO', 'realme', 'Huawei', 'Honor', 'Motorola',
  'Nothing', 'Sony', 'ASUS', 'ROG', 'ZTE', 'nubia', 'RedMagic',
  'TECNO', 'Infinix', 'itel', 'Nokia', 'HMD', 'TCL', 'Sharp',
  'Meizu', 'Lenovo', 'Fairphone', 'CMF', 'Other',
] as const;

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function BrandSelect({ value, onChange }: Props) {
  const known = PHONE_BRANDS.includes(value as typeof PHONE_BRANDS[number]) && value !== 'Other';
  const selected = !value ? '' : known ? value : 'Other';

  function changeBrand(event: ChangeEvent<HTMLSelectElement>) {
    onChange(event.currentTarget.value === 'Other' ? 'Other' : event.currentTarget.value);
  }

  return (
    <>
      <select value={selected} onChange={changeBrand}>
        <option value="">Select a brand</option>
        {PHONE_BRANDS.map(brand => <option key={brand} value={brand}>{brand}</option>)}
      </select>
      {selected === 'Other' && (
        <input
          type="text"
          aria-label="Custom brand name"
          value={value === 'Other' ? '' : value}
          placeholder="Enter brand name"
          onChange={event => onChange(event.currentTarget.value || 'Other')}
        />
      )}
    </>
  );
}
