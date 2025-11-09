import React from 'react';
import * as ToggleGroup from '@radix-ui/react-toggle-group';

interface CurrencyToggleProps {
  currency: 'USD' | 'RMB';
  onChange: (currency: 'USD' | 'RMB') => void;
}

const CurrencyToggle: React.FC<CurrencyToggleProps> = ({ currency, onChange }) => {
  const handleValueChange = (value: string) => {
    if (value === 'USD' || value === 'RMB') {
      onChange(value);
    }
  };

  return (
    <ToggleGroup.Root
      type="single"
      value={currency}
      onValueChange={handleValueChange}
      className="inline-flex bg-gray-100 rounded-lg p-1"
    >
      <ToggleGroup.Item
        value="USD"
        className="px-4 py-2 text-sm font-medium rounded-md transition-colors data-[state=on]:bg-white data-[state=on]:text-blue-600 data-[state=on]:shadow-sm data-[state=off]:text-gray-600 data-[state=off]:hover:text-gray-900"
      >
        USD
      </ToggleGroup.Item>
      <ToggleGroup.Item
        value="RMB"
        className="px-4 py-2 text-sm font-medium rounded-md transition-colors data-[state=on]:bg-white data-[state=on]:text-blue-600 data-[state=on]:shadow-sm data-[state=off]:text-gray-600 data-[state=off]:hover:text-gray-900"
      >
        RMB
      </ToggleGroup.Item>
    </ToggleGroup.Root>
  );
};

export default CurrencyToggle;
