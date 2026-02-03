'use client'

import React from 'react'

interface RadioButtonGroupProps<T extends string> {
  options: { value: T; label: string; icon?: string }[]
  value: T
  onChange: (value: T) => void
  className?: string
}

export function RadioButtonGroup<T extends string>({
  options,
  value,
  onChange,
  className = '',
}: RadioButtonGroupProps<T>) {
  return (
    <div className={`flex gap-4 flex-wrap ${className}`}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`radio-button ${
            value === option.value ? 'active' : 'inactive'
          }`}
        >
          {option.icon && <span className="mr-2">{option.icon}</span>}
          {option.label}
        </button>
      ))}
    </div>
  )
}
