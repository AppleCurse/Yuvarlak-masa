import React, { useState } from "react";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Image as ImageIcon,
  Layers,
  Maximize2,
  RefreshCw,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";
import { ASPECT_RATIO_OPTIONS, IMAGE_STYLE_PRESETS } from "../lib/defaults";
import { AspectRatio, ImageAsset, ImageModel } from "../types";
import { Button, Chip, Modal, Panel, PanelHeader, Select, StatusDot, TextArea, TextInput } from "./ui";

const SAMPLE_PROMPTS = [
  "Futuristic AI council chamber with three glowing holographic representatives debating strategy on an obsidian roundtable, cinematic lighting, ultra-detailed",
  "Technical blueprint architectural diagram of a distributed microservice event-stream pipeline, glowing cyan and amber conduits on dark grid",
  "Blind jury court of three isolated AI judges behind translucent chromatic glass cubicles, high-tech judicial cyberpunk aesthetic",
  "Ultrawide panoramic command bridge overlooking a neon-illuminated cyber metropolis, data HUD consoles and glass interactive terminals",
];

export function ImageStudioRoom({
  images,
  onGenerateImage,
  generating,
  councilTopic,
  refereeReport,
}: {
  images: ImageAsset[];
  onGenerateImage: (params: {
    prompt: string;
    aspectRatio: AspectRatio;
    model: ImageModel;
    style: string;
  }) => Promise<void>;
  generating: boolean;
  councilTopic?: string;
  refereeReport?: string;
}) {
  const [prompt, setPrompt] = useState(
    councilTopic
      ? `Konsept görseli: ${councilTopic}, high-tech futuristic command station visualization`
      : SAMPLE_PROMPTS[0]
  );
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [model, setModel] = useState<ImageModel>("gemini-nano-banana-2.1");
  const [style, setStyle] = useState<string>("cyberpunk");
  const [selectedAsset, setSelectedAsset] = useState<ImageAsset | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim() || generating) return;
    await onGenerateImage({
      prompt: prompt.trim(),
      aspectRatio,
      model,
      style,
    });
  };

  const currentRatioMeta =
    ASPECT_RATIO_OPTIONS.find((r) => r.value === aspectRatio) ||
    ASPECT_RATIO_OPTIONS[0];

  const handleCopyPrompt = (p: string) => {
    navigator.clipboard.writeText(p);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 1400);
  };

  const handleDownload = (asset: ImageAsset) => {
    const a = document.createElement("a");
    a.href = asset.imageUrl;
    const isSvg = asset.imageUrl.startsWith("data:image/svg");
    a.download = `konsul-visual-${asset.aspectRatio.replace(":", "-")}-${asset.id}.${isSvg ? "svg" : "png"}`;
    a.click();
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4 lg:flex-row">
      {/* Left Control Panel: Prompt & Aspect Ratio Selector */}
      <div className="flex w-full shrink-0 flex-col gap-3 lg:w-[440px] overflow-y-auto">
        <Panel glowColor="#ec4899">
          <PanelHeader
            title="Görsel & Konsept Stüdyosu"
            accent="#ec4899"
            icon={<ImageIcon size={15} />}
            right={
              <Chip color="#ec4899">
                <StatusDot tone={generating ? "#ec4899" : "#22c55e"} pulse={generating} />
                <span>{generating ? "çiziliyor..." : "hazır"}</span>
              </Chip>
            }
          />
          <div className="space-y-3.5 p-3.5">
            {/* Quick Context Injection Buttons */}
            {(councilTopic || refereeReport) && (
              <div className="flex flex-wrap gap-1.5">
                {councilTopic && (
                  <button
                    onClick={() =>
                      setPrompt(
                        `Konsey konusu görselleştirmesi: ${councilTopic}, high-tech blueprint diagram and architectural visualization, sharp cinematic render`
                      )
                    }
                    className="flex items-center gap-1 rounded-md border border-[#303a48] bg-[#161b22] px-2 py-1 font-mono text-[10px] text-[#8b949e] hover:border-[#c084fc] hover:text-white"
                  >
                    <Sparkles size={11} className="text-[#c084fc]" />
                    <span>Konsey Konusunu Aktar</span>
                  </button>
                )}
                {refereeReport && (
                  <button
                    onClick={() =>
                      setPrompt(
                        `Nihai hakem karar ve eylem planı konsepti: ${refereeReport.slice(0, 140)}, futuristic command dashboard, clear information architecture`
                      )
                    }
                    className="flex items-center gap-1 rounded-md border border-[#303a48] bg-[#161b22] px-2 py-1 font-mono text-[10px] text-[#8b949e] hover:border-[#fbbf24] hover:text-white"
                  >
                    <Wand2 size={11} className="text-[#fbbf24]" />
                    <span>Hakem Kararını Aktar</span>
                  </button>
                )}
              </div>
            )}

            {/* Prompt Input Area */}
            <div>
              <div className="mb-1 flex items-center justify-between font-mono text-[10.5px] uppercase tracking-wider text-[#8b949e]">
                <span>Görsel İstemi (Prompt)</span>
                <span>{prompt.length} karakter</span>
              </div>
              <TextArea
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Üretmek istediğiniz görseli detaylıca tarif edin..."
                className="text-xs leading-relaxed"
              />
            </div>

            {/* Sample Prompts */}
            <div className="space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#57606a]">
                Örnek Şablonlar
              </span>
              <div className="flex flex-col gap-1">
                {SAMPLE_PROMPTS.map((sample, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(sample)}
                    className="truncate rounded-md border border-[#222a35] bg-[#0b1016] px-2 py-1 text-left font-mono text-[10px] text-[#8b949e] transition-colors hover:border-[#38bdf8] hover:text-white"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>

            {/* ══ ASPECT RATIO CONTROL (MANDATORY REQUIREMENT) ══ */}
            <div className="border-t border-[#222a35] pt-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-disp text-xs font-bold uppercase tracking-wider text-white">
                  En-Boy Oranı (Aspect Ratio)
                </span>
                <Chip color="#38bdf8">
                  {currentRatioMeta.label} ({currentRatioMeta.width}×{currentRatioMeta.height})
                </Chip>
              </div>

              {/* 8 Aspect Ratio Grid */}
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-4">
                {ASPECT_RATIO_OPTIONS.map((ratio) => {
                  const isSelected = aspectRatio === ratio.value;
                  return (
                    <button
                      key={ratio.value}
                      onClick={() => setAspectRatio(ratio.value)}
                      className={`group flex flex-col items-center justify-between rounded-xl border p-2 text-center transition-all cursor-pointer ${
                        isSelected
                          ? "border-[#38bdf8] bg-[#38bdf8]/15 shadow-md shadow-sky-950/40 text-white"
                          : "border-[#222a35] bg-[#11161d] text-[#8b949e] hover:border-[#303a48] hover:bg-[#161b22] hover:text-white"
                      }`}
                    >
                      {/* Geometric Miniature Ratio Box */}
                      <div className="grid h-10 w-full place-items-center">
                        <div
                          className={`rounded transition-colors ${
                            isSelected
                              ? "bg-[#38bdf8] shadow-sm shadow-sky-400"
                              : "bg-[#303a48] group-hover:bg-[#4a5568]"
                          }`}
                          style={{
                            aspectRatio: ratio.cssAspect,
                            maxHeight: "30px",
                            maxWidth: "46px",
                            height: ratio.height > ratio.width ? "30px" : undefined,
                            width: ratio.width >= ratio.height ? "36px" : undefined,
                          }}
                        />
                      </div>
                      <div className="mt-1 font-disp text-[11px] font-bold">
                        {ratio.value}
                      </div>
                      <div className="truncate font-mono text-[8.5px] opacity-75">
                        {ratio.label.split(" ")[1] || ratio.value}
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[10.5px] text-[#8b949e]">
                {currentRatioMeta.desc}
              </p>
            </div>

            {/* Model & Style Selectors */}
            <div className="grid grid-cols-2 gap-2 border-t border-[#222a35] pt-3">
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-[#8b949e]">
                  Yapay Zeka Modeli
                </label>
                <Select
                  value={model}
                  onChange={(e) => setModel(e.target.value as ImageModel)}
                  className="py-1.5 text-xs font-mono"
                >
                  <option value="gemini-nano-banana-2.1">
                    gemini-nano-banana-2.1 (Genel / 1K-4K)
                  </option>
                  <option value="gemini-3-pro-image-preview">
                    gemini-3-pro-image-preview (Stüdyo Kalite)
                  </option>
                </Select>
              </div>

              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-[#8b949e]">
                  Görsel Üslubu
                </label>
                <Select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="py-1.5 text-xs"
                >
                  {IMAGE_STYLE_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Generate Action Button */}
            <Button
              variant="primary"
              className="w-full py-3 text-xs font-bold"
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
            >
              {generating ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Görsel İşleniyor ({aspectRatio})...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>{aspectRatio} Formatında Üret</span>
                </>
              )}
            </Button>
          </div>
        </Panel>
      </div>

      {/* Right Gallery / Showcase Panel */}
      <Panel className="flex min-w-0 flex-1 flex-col overflow-hidden" glowColor="#38bdf8">
        <PanelHeader
          accent="#38bdf8"
          icon={<Layers size={15} />}
          title={`Üretilen Görseller & Konsept Arşivi (${images.length})`}
          right={
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-[#8b949e]">
                Seçili Oran: <b className="text-white">{aspectRatio}</b>
              </span>
            </div>
          }
        />

        <div className="flex-1 overflow-y-auto p-4">
          {images.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center text-[#8b949e]">
              <div className="mb-3 grid h-16 w-16 place-items-center rounded-2xl border border-[#222a35] bg-[#111722] text-[#ec4899] shadow-lg shadow-pink-950/20">
                <ImageIcon size={32} />
              </div>
              <h3 className="font-disp text-base font-bold text-white">
                Henüz Görsel Üretilmedi
              </h3>
              <p className="mt-1.5 max-w-md text-xs leading-relaxed text-[#8b949e]">
                Sol taraftan bir en-boy oranı seçin (<b>1:1, 2:3, 3:2, 3:4, 4:3, 9:16, 16:9, 21:9</b>),
                isteminizi girin ve <b>Üret</b> butonuna tıklayın.
                Konsey tartışmalarının ve hakem kararlarının yüksek çözünürlüklü şemaları burada toplanır.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {images.map((asset) => (
                <div
                  key={asset.id}
                  className="group relative flex flex-col overflow-hidden rounded-xl border border-[#222a35] bg-[#111722] transition-all hover:border-[#38bdf8] hover:shadow-xl hover:shadow-sky-950/30"
                >
                  {/* Image Display Frame */}
                  <div
                    className="relative flex items-center justify-center overflow-hidden bg-[#0a0e14] cursor-pointer"
                    style={{
                      aspectRatio:
                        ASPECT_RATIO_OPTIONS.find((r) => r.value === asset.aspectRatio)?.cssAspect ||
                        "16 / 9",
                    }}
                    onClick={() => setSelectedAsset(asset)}
                  >
                    <img
                      src={asset.imageUrl}
                      alt={asset.prompt}
                      className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                    />

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 backdrop-blur-xs transition-opacity group-hover:opacity-100">
                      <Button size="sm" variant="primary">
                        <Maximize2 size={13} />
                        <span>Büyüt</span>
                      </Button>
                    </div>

                    {/* Aspect Ratio Badge */}
                    <div className="absolute top-2 left-2 z-10">
                      <Chip color="#38bdf8">
                        {asset.aspectRatio}
                      </Chip>
                    </div>
                  </div>

                  {/* Image Metadata */}
                  <div className="flex flex-1 flex-col justify-between p-3">
                    <p className="line-clamp-2 text-xs font-medium text-white leading-snug" title={asset.prompt}>
                      {asset.prompt}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between border-t border-[#222a35] pt-2 font-mono text-[9.5px] text-[#8b949e]">
                      <span className="truncate">{asset.model}</span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleDownload(asset)}
                          className="rounded p-1 text-[#8b949e] hover:text-white"
                          title="İndir"
                        >
                          <Download size={13} />
                        </button>
                        <button
                          onClick={() => handleCopyPrompt(asset.prompt)}
                          className="rounded p-1 text-[#8b949e] hover:text-white"
                          title="İstemi Kopyala"
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Panel>

      {/* Lightbox Modal for Full View */}
      {selectedAsset && (
        <Modal
          open={Boolean(selectedAsset)}
          onClose={() => setSelectedAsset(null)}
          title={`Görsel İnceleme · ${selectedAsset.aspectRatio} Format`}
          maxWidth="max-w-4xl"
          icon={<Maximize2 size={16} />}
        >
          <div className="flex flex-col gap-4">
            <div className="relative flex max-h-[65vh] items-center justify-center overflow-hidden rounded-xl bg-[#0a0e14] p-2">
              <img
                src={selectedAsset.imageUrl}
                alt={selectedAsset.prompt}
                className="max-h-[60vh] max-w-full rounded-lg object-contain shadow-2xl"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#222a35] pt-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Chip color="#38bdf8">{selectedAsset.aspectRatio}</Chip>
                  <Chip>{selectedAsset.model}</Chip>
                  <span className="font-mono text-[11px] text-[#8b949e]">
                    {new Date(selectedAsset.createdAt).toLocaleTimeString("tr-TR")}
                  </span>
                </div>
                <p className="max-w-xl text-xs text-white leading-relaxed">
                  {selectedAsset.prompt}
                </p>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleCopyPrompt(selectedAsset.prompt)}>
                  {copiedPrompt ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{copiedPrompt ? "Kopyalandı" : "İstemi Kopyala"}</span>
                </Button>
                <Button size="sm" variant="primary" onClick={() => handleDownload(selectedAsset)}>
                  <Download size={13} />
                  <span>Dosyayı İndir</span>
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
