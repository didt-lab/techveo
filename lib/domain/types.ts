export interface Empleado {
  id: string;
  matricula: string;
  nombre: string;
  fecha_nacimiento: string; // "YYYY-MM-DD"
  fecha_ingreso: string;    // "YYYY-MM-DD"
  foto_url: string | null;
  mostrar_cumpleanos: boolean;
  mostrar_aniversario: boolean;
  created_at: string;
}

export interface BirthdayEvent {
  empleado: Empleado;
  fechaCumple: string; // "15 de Mayo" — formatted for display
}

export interface AnniversaryEvent {
  empleado: Empleado;
  anosServicio: number;
}

export interface EventsResponse {
  cumpleanos: BirthdayEvent[];
  aniversarios: AnniversaryEvent[];
  fetchedAt: string;
}

export interface NewHireEvent {
  empleado: Empleado;
  fechaIngreso: string; // "8 de Abril de 2026" — formatted for display
}

export interface NewHiresResponse {
  nuevosIngresos: NewHireEvent[];
  fetchedAt: string;
}

export interface ImportResult {
  created: number;
  updated: number;
  errors: { row: number; message: string }[];
}

export interface TechNoticia {
  id: string;
  titulo: string;
  parrafo: string;
  media_url: string;
  media_type: "imagen" | "video";
  orden: number;
  activo: boolean;
  created_at: string;
}

export interface TechNoticiasResponse {
  noticias: TechNoticia[];
  fetchedAt: string;
}
