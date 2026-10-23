export type RoomId =
  | "council"
  | "jury"
  | "synthesis"
  | "autopsy"
  | "images"
  | "records"
  | "settings"
  | "street"
  | "devils_advocate"
  | "lie_detector"
  | "timeless"
  | "courtroom";


export interface StreetCharacter {
  id: string;
  name: string;
  archetype: string;
  tagline: string;
  avatar: string;
  color: string;
  systemPrompt: string;
}

export type ProviderKind = "openai" | "gemini" | "demo";

export interface Provider {
  id: string;
  name: string;
  kind: ProviderKind;
  baseUrl: string;
  apiKey: string;
  color: string;
  models: string[];
  enabled: boolean;
  sortIndex: number;
  note: string;
}

export type SeatSlot = "strategist" | "engineer" | "critic" | "referee" | "custom";

export interface Seat {
  id: string;
  slot: SeatSlot;
  name: string;
  roleTitle: string;
  avatar: string;
  systemPrompt: string;
  providerId: string;
  model: string;
  color: string;
  temperature: number;
  maxTokens: number;
  active: boolean;
  sortIndex: number;
}

export type SpeakerKind = "human" | "seat" | "system";
export type MessageStatus = "done" | "streaming" | "stopped" | "error";

export interface Message {
  id: string;
  topicId: string;
  speaker: SpeakerKind;
  seatId: string | null;
  authorName: string;
  roleTitle: string;
  providerName: string;
  model: string;
  color: string;
  avatar: string;
  content: string;
  round: number;
  tokens: number;
  latencyMs: number;
  status: MessageStatus;
  error?: string;
  createdAt: string;
}

export interface SessionTopic {
  id: string;
  room: RoomId;
  title: string;
  question: string;
  status: "idle" | "running" | "done" | "stopped" | "error";
  rounds: number;
  sourceText?: string;
  report?: string;
  pinned: boolean;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export type AspectRatio =
  | "1:1"
  | "2:3"
  | "3:2"
  | "3:4"
  | "4:3"
  | "9:16"
  | "16:9"
  | "21:9";

export interface AspectRatioOption {
  value: AspectRatio;
  label: string;
  desc: string;
  width: number;
  height: number;
  cssAspect: string;
  iconName: string;
}

export type ImageModel = "gemini-nano-banana-2.1" | "gemini-3-pro-image-preview";

export interface ImageAsset {
  id: string;
  prompt: string;
  aspectRatio: AspectRatio;
  model: ImageModel;
  imageUrl: string;
  sourceOrigin?: string;
  createdAt: string;
  latencyMs: number;
  style?: string;
  note?: string;
}

export interface ProbeResult {
  ok: boolean;
  label: string;
  models: string[];
  latencyMs: number;
}
