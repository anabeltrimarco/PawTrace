"use client";

interface FilterBarProps {
  tipo: string;
  especie: string;
  q: string;
  onTipoChange: (v: string) => void;
  onEspecieChange: (v: string) => void;
  onQChange: (v: string) => void;
}

export default function FilterBar({
  tipo,
  especie,
  q,
  onTipoChange,
  onEspecieChange,
  onQChange,
}: FilterBarProps) {
  return (
    <div className="filter-bar">
      <select value={tipo} onChange={(e) => onTipoChange(e.target.value)}>
        <option value="">Todos los tipos</option>
        <option value="perdido">Perdido</option>
        <option value="encontrado">Encontrado</option>
        <option value="avistamiento">Avistamiento</option>
      </select>

      <select value={especie} onChange={(e) => onEspecieChange(e.target.value)}>
        <option value="">Todas las especies</option>
        <option value="perro">Perro</option>
        <option value="gato">Gato</option>
        <option value="otro">Otro</option>
      </select>

      <input
        type="text"
        placeholder="Buscar por descripción o ubicación..."
        value={q}
        onChange={(e) => onQChange(e.target.value)}
      />
    </div>
  );
}
