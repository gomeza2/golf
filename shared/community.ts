import { validateRoomWorkshop } from "./roomWorkshop";
import type { WorkshopDocument } from "./workshop";
import type { PhysicsEdition } from "./rules";
export const difficulties = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof difficulties)[number];
export const difficultyLabels: Record<Difficulty, string> = {
  easy: "Iniciación",
  medium: "Intermedio",
  hard: "Experto",
};
export const featureLabels = {
  water: "Agua",
  sand: "Arena",
  rough: "Césped alto",
  dirt: "Tierra",
  ramps: "Rampas",
  heights: "Alturas",
  moving: "Mecanismos",
  narrow: "Pasos estrechos",
};
export type Feature = keyof typeof featureLabels;
export type RevisionStatus = "pending" | "published" | "rejected" | "withdrawn";
export type CreationSummary = {
  physics?: PhysicsEdition;
  id: string;
  revision: number;
  title: string;
  description: string;
  difficulty: Difficulty;
  features: Feature[];
  author: { id: string; name: string };
  status: RevisionStatus;
  createdAt: string;
  publishedAt: string | null;
  hash: string;
  par: number;
  stats: {
    pieces: number;
    ramps: number;
    moving: number;
    maxHeight: number;
    holes: 1;
  };
  reason?: string;
  preview?: WorkshopDocument;
};
export type CreationDetail = CreationSummary & {
  document?: WorkshopDocument;
  versions: {
    revision: number;
    status: RevisionStatus;
    publishedAt: string | null;
    physics?: PhysicsEdition;
  }[];
};
export type CommunityConfig = {
  documentVersions?: number[];
  available: boolean;
  publishing: boolean;
  reason?: string;
  preview?: WorkshopDocument;
  auth: null | {
    issuer: string;
    clientId: string;
    audience: string;
    scope: string;
  };
};
export type CommunityActor = { id: string; name: string; moderator: boolean };
export const isCreationId = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
export function textField(
  value: unknown,
  label: string,
  min: number,
  max: number,
) {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.trim().length > max ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)
  )
    throw Error(`${label}: entre ${min} y ${max} caracteres.`);
  return value.trim();
}
export function publicationInput(value: unknown) {
  const p = value as Record<string, unknown>;
  if (!p || typeof p !== "object") throw Error("Publicación inválida.");
  const validated = validateRoomWorkshop(p.document);
  textField(validated.document.name, "Nombre", 3, 48);
  if (!difficulties.includes(p.difficulty as Difficulty))
    throw Error("Elige una dificultad.");
  const description = textField(p.description, "Descripción", 15, 1200);
  const authorName = textField(p.authorName, "Nombre de autor", 2, 48);
  if (p.creationId !== undefined && !isCreationId(p.creationId))
    throw Error("Identificador de creación inválido.");
  if (
    p.creationId !== undefined &&
    (!Number.isInteger(p.expectedVersion) || (p.expectedVersion as number) < 1)
  )
    throw Error("Falta la versión de partida.");
  const pieces = validated.document.pieces;
  const features: Feature[] = [];
  if (pieces.some((p) => p.kind === "water")) features.push("water");
  if (pieces.some((p) => p.kind === "sand")) features.push("sand");
  if (pieces.some((p) => p.kind === "rough")) features.push("rough");
  if (pieces.some((p) => p.kind === "dirt")) features.push("dirt");
  if (pieces.some((p) => p.kind === "ramp")) features.push("ramps");
  if (
    pieces.some(
      (p) => p.height > 0.5 || p.endHeight > 0.5 || p.kind === "lift",
    ) ||
    validated.document.cup.height > 0.5
  )
    features.push("heights");
  if (pieces.some((p) => ["gate", "rotor", "lift"].includes(p.kind)))
    features.push("moving");
  if (
    pieces.some((p) => (p.kind === "floor" || p.kind === "ramp") && p.width < 2)
  )
    features.push("narrow");
  const stats = {
    pieces: pieces.length,
    ramps: pieces.filter((p) => p.kind === "ramp").length,
    moving: validated.cost.mechanisms,
    maxHeight: Math.max(
      validated.document.cup.height,
      ...pieces.flatMap((p) => [
        p.height,
        p.endHeight,
        ...(validated.document.version === 3 && p.kind === "lift"
          ? [p.height + 2.5]
          : []),
      ]),
    ),
    holes: 1 as const,
  };
  return {
    ...validated,
    description,
    authorName,
    difficulty: p.difficulty as Difficulty,
    features,
    stats,
    creationId: p.creationId as string | undefined,
    expectedVersion: p.expectedVersion as number | undefined,
  };
}
export function galleryFilter(params: URLSearchParams) {
  const q = (params.get("q") || "").trim(),
    author = (params.get("author") || "").trim(),
    difficulty = params.get("difficulty") || "",
    authorId = params.get("authorId") || "";
  const features = params.getAll("feature");
  const physics = params.get("physics") || "";
  const page = Number(params.get("page") || 1);
  if (
    q.length > 80 ||
    author.length > 64 ||
    features.length > Object.keys(featureLabels).length ||
    features.some((f) => !Object.hasOwn(featureLabels, f)) ||
    (difficulty && !difficulties.includes(difficulty as Difficulty)) ||
    !["", "1", "2"].includes(physics) ||
    (authorId && !isCreationId(authorId)) ||
    !Number.isInteger(page) ||
    page < 1 ||
    page > 1000
  )
    throw Error("Filtro de búsqueda inválido.");
  return {
    q,
    author,
    authorId,
    difficulty,
    physics,
    features: [...new Set(features)] as Feature[],
    page,
  };
}
