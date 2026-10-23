export const PRESET_COLORS = [
  '#EF4444', // Rouge
  '#F97316', // Orange
  '#F59E0B', // Ambre
  '#EAB308', // Jaune
  '#84CC16', // Lime
  '#22C55E', // Vert
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#3B82F6', // Bleu
  '#8B5CF6', // Violet
  '#EC4899', // Rose
  '#A855F7', // Pourpre
];

interface ColorPickerProps {
  selectedColor: string;
  onSelect: (color: string) => void;
}

export default function ColorPicker({
  selectedColor,
  onSelect,
}: ColorPickerProps) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {PRESET_COLORS.map((color) => (
        <button
          key={color}
          onClick={() => onSelect(color)}
          className={`w-10 h-10 rounded-full transition-all ${
            selectedColor === color
              ? 'ring-4 ring-white ring-offset-2'
              : 'hover:scale-110'
          }`}
          style={{ backgroundColor: color }}
          aria-label={`Couleur ${color}`}
        />
      ))}
    </div>
  );
}
