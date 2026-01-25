'use client';

import React, { useState } from 'react';
import { RadioButton, RadioOption } from './radio-button';

/**
 * Example usage of the RadioButton component
 */
export function RadioButtonDemo() {
  const [selectedValue, setSelectedValue] = useState('');

  // Example options - can be any array of objects with value and optional label
  const sizeOptions: RadioOption[] = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
  ];

  const colorOptions: RadioOption[] = [
    { value: 'red', label: 'Red' },
    { value: 'blue', label: 'Blue' },
    { value: 'green', label: 'Green' },
  ];

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Radio Button Component Demo</h1>

      {/* Example 1: Basic radio buttons with labels */}
      <div style={{ marginBottom: '2rem' }}>
        <h2>Size Selection</h2>
        <RadioButton
          options={sizeOptions}
          value={selectedValue}
          onChange={setSelectedValue}
          name="size-radio"
        />
        <p>Selected: {selectedValue || 'None'}</p>
      </div>

      {/* Example 2: Radio buttons with different name */}
      <div style={{ marginBottom: '2rem' }}>
        <h2>Color Selection</h2>
        <RadioButton
          options={colorOptions}
          name="color-radio"
          onChange={(value) => console.log('Color selected:', value)}
        />
      </div>

      {/* Example 3: Disabled state */}
      <div style={{ marginBottom: '2rem' }}>
        <h2>Disabled Radio Buttons</h2>
        <RadioButton
          options={sizeOptions}
          disabled={true}
          name="disabled-radio"
        />
      </div>

      {/* Example 4: Without labels */}
      <div>
        <h2>Radio Buttons Without Labels</h2>
        <RadioButton
          options={[
            { value: 'value-1' },
            { value: 'value-2' },
            { value: 'value-3' },
          ]}
          name="no-label-radio"
        />
      </div>
    </div>
  );
}

export default RadioButtonDemo;
