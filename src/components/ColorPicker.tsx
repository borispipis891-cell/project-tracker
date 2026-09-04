'use client';

import { useState } from 'react';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

const PRESET_COLORS = [
  { name: 'Синий', hex: '#3B82F6' },
  { name: 'Красный', hex: '#EF4444' },
  { name: 'Зелёный', hex: '#10B981' },
  { name: 'Жёлтый', hex: '#F59E0B' },
  { name: 'Фиолетовый', hex: '#8B5CF6' },
  { name: 'Розовый', hex: '#EC4899' },
  { name: 'Индиго', hex: '#6366F1' },
  { name: 'Оранжевый', hex: '#F97316' },
  { name: 'Изумрудный', hex: '#059669' },
  { name: 'Голубой', hex: '#06B6D4' },
  { name: 'Серый', hex: '#6B7280' },
  { name: 'Чёрный', hex: '#1F2937' },
];

export default function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className="w-10 h-10 rounded-lg border-2 border-gray-300 hover:border-gray-400 transition-colors"
        style={{ backgroundColor: value }}
        title="Выбрать цвет"
      />

      {showPicker && (
        <div className="absolute top-12 left-0 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-50">
          <div className="grid grid-cols-6 gap-2 mb-3">
            {PRESET_COLORS.map((color) => (
              <button
                key={color.hex}
                type="button"
                onClick={() => {
                  onChange(color.hex);
                  setShowPicker(false);
                }}
                className="w-8 h-8 rounded-md border-2 border-gray-200 hover:border-gray-400 transition-colors"
                style={{ backgroundColor: color.hex }}
                title={color.name}
              />
            ))}
          </div>

          <div className="border-t border-gray-200 pt-3">
            <label className="text-xs text-gray-600 block mb-1">Свой цвет</label>
            <input
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full h-8 rounded cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowPicker(false)}
            className="mt-3 w-full text-sm text-gray-600 hover:text-gray-800"
          >
            Закрыть
          </button>
        </div>
      )}
    </div>
  );
}
