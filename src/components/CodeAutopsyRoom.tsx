import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Bug,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Download,
  FileCode,
  FileText,
  Flame,
  Gavel,
  GitBranch,
  GitCommit,
  Hash,
  Play,
  RotateCcw,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  Upload,
} from "lucide-react";
import { Button, Chip, Panel, PanelHeader, StatusDot, TextArea, TextInput } from "./ui";
import { MarkdownView } from "./MarkdownView";
import { Provider, Seat } from "../types";
import { streamChat } from "../lib/api";

const SAMPLE_PLATFORM_REGISTRY_PY = `"""
platform_registry.py - URL Routing and Social Platform Extraction
BUG AUDIT: Commit 80e57f7d regression investigation
"""
import re
from urllib.parse import urlparse

# --- ÖNCEKİ SAĞLAM SÖZLEŞME (11/11 Test Geçiyordu) ---
# def resolve_platform_old(u: str) -> str:
#     if "instagram.com" in u:
#         return "instagram"
#     if "x.com" in u or "twitter.com" in u:
#         return "x"
#     return "unsupported_web"

# --- COMMIT 80e57f7d İLE DEĞİŞEN KOD (11 Testi Patlatan Hata) ---
def classify_url(url: str) -> str:
    domain = urlparse(url).netloc.lower()
    # HATA BURADA: query string veya subdomain varyantlarında (/p/ postları)
    # path tabanlı regex netloc'u kaçırıyor ve 'unsupported_web' dönüyor!
    if domain.startswith("www."):
        domain = domain[4:]
    if domain == "instagram.com":
        return "instagram"
    if domain in ("x.com", "twitter.com"):
        return "x"
    return "unsupported_web"

def handle_incoming_post(post_url: str):
    platform = classify_url(post_url)
    if platform == "unsupported_web":
        raise ValueError(f"Desteklenmeyen URL: {post_url} - Test patladı!")
    return {"url": post_url, "platform": platform, "status": "READY"}
`;

export function CodeAutopsyRoom({
  seats,
  providers,
  onSendToCouncil,
}: {
  seats: Seat[];
  providers: Provider[];
  onSendToCouncil: (question: string) => void;
}) {
  const [codeContent, setCodeContent] = useState(SAMPLE_PLATFORM_REGISTRY_PY);
  const [filename, setFilename] = useState("platform_registry.py");
  const [autopsyMode, setAutopsyMode] = useState<"bug" | "arch" | "security">("bug");
  const [operatorDirective, setOperatorDirective] = useState(
    "Commit 80e57f7d incelemesi: Instagram /p/ URL'leri neden unsupported_web dönüp 11 testi patlatıyor? Satır satır ameliyat edin ve çalışan yamayı verin."
  );

  const [autopsyOutputs, setAutopsyOutputs] = useState<{
    strategist?: string;
    engineer?: string;
    critic?: string;
    referee?: string;
  }>({});
  const [running, setRunning] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedPatch, setCopiedPatch] = useState(false);

  // Line count and hash fingerprint
  const lines = useMemo(() => codeContent.split("\n"), [codeContent]);
  const caseId = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < codeContent.length; i++) {
      hash = (hash << 5) - hash + codeContent.charCodeAt(i);
      hash |= 0;
    }
    return `OTOPSI-2026-${Math.abs(hash).toString(16).toUpperCase().padStart(8, "0")}`;
  }, [codeContent]);

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCodeContent(String(ev.target?.result || ""));
    };
    reader.readAsText(file);
  };

  const handleRunAutopsy = async () => {
    if (!codeContent.trim() || running) return;
    setRunning(true);
    setAutopsyOutputs({});

    const strategistSeat = seats.find((s) => s.slot === "strategist") || seats[0];
    const engineerSeat = seats.find((s) => s.slot === "engineer") || seats[1];
    const criticSeat = seats.find((s) => s.slot === "critic") || seats[2];
    const refereeSeat = seats.find((s) => s.slot === "referee") || seats[3];

    const strategistProvider = providers.find((p) => p.id === strategistSeat.providerId) || providers[0];
    const engineerProvider = providers.find((p) => p.id === engineerSeat.providerId) || providers[0];
    const criticProvider = providers.find((p) => p.id === criticSeat.providerId) || providers[0];
    const refereeProvider = providers.find((p) => p.id === refereeSeat.providerId) || providers[0];

    const basePrompt = `YAZILIM ADLİ TIP VE TAKTİKSEL KOD OTOPSİSİ
VAKA NO: ${caseId}
DOSYA: ${filename}
OPERATÖR TALİMATI: ${operatorDirective}
=== İNCELENEN KOD METNİ ===
${codeContent}
=== KOD SONU ===`;

    // 1. Model A - Stratejist (Mimari sözleşme ve tavan tespiti)
    let stratText = "";
    await streamChat({
      provider: strategistProvider,
      seat: strategistSeat,
      model: strategistSeat.model,
      messages: [
        {
          role: "system",
          content: `${strategistSeat.systemPrompt}\nSen bir YAZILIM MİMARİ STRATEJİSTİSİN. Verilen dosyadaki sözleşme ihlallerini, API sınırlarını ve regresyonun büyük resimdeki yıkıcı etkisini net maddelerle teşhis et.`,
        },
        {
          role: "user",
          content: `${basePrompt}\nRolün gereği mimari sözleşmeyi, geriye dönük uyumluluk riskini ve stratejik hamleyi belirt.`,
        },
      ],
      onToken: (_t, full) => {
        stratText = full;
        setAutopsyOutputs((prev) => ({ ...prev, strategist: full }));
      },
    });

    // 2. Model B - Tekniker (Çalışan kod yaması ve satır analizi)
    let engText = "";
    await streamChat({
      provider: engineerProvider,
      seat: engineerSeat,
      model: engineerSeat.model,
      messages: [
        {
          role: "system",
          content: `${engineerSeat.systemPrompt}\nSen bir BAŞ KODLAYICI / MÜHENDİSSİN. Stratejistin teşhisini al, hatayı satır satır gider ve ÇALIŞAN SOMUT BİR KOD YAMASI / DIFF sun. Lafı uzatma, temiz ve derlenebilir kod ver.`,
        },
        {
          role: "user",
          content: `${basePrompt}\nStratejistin değerlendirmesi:\n${stratText}\n\nŞimdi hatayı gideren çalışan somut kodu ve diff yamasını yaz.`,
        },
      ],
      onToken: (_t, full) => {
        engText = full;
        setAutopsyOutputs((prev) => ({ ...prev, engineer: full }));
      },
    });

    // 3. Model C - Eleştirmen (Açık ve kör nokta avı, test denetimi)
    let criticText = "";
    await streamChat({
      provider: criticProvider,
      seat: criticSeat,
      model: criticSeat.model,
      messages: [
        {
          role: "system",
          content: `${criticSeat.systemPrompt}\nSen bir ADLİ KOD ELEŞTİRMENİ / QA ŞÜPHECİSİSİN. Teknikerin sunduğu kod yamasındaki uç durumları (edge cases), eksik testleri ve olası sahte başarı durumlarını denetle. Veto gerekçelerini listele.`,
        },
        {
          role: "user",
          content: `${basePrompt}\nTeknikerin sunduğu yama:\n${engText}\n\nBu kod hangi şartta yine patlar? En az 2 uç senaryo bul ve zayıf noktaları afişe et.`,
        },
      ],
      onToken: (_t, full) => {
        criticText = full;
        setAutopsyOutputs((prev) => ({ ...prev, critic: full }));
      },
    });

    // 4. Başhakem - Nihai Karar (Merge / Veto)
    await streamChat({
      provider: refereeProvider,
      seat: refereeSeat,
      model: refereeSeat.model,
      messages: [
        {
          role: "system",
          content: `${refereeSeat.systemPrompt}\nSen YAZILIM YÜKSEK HAKEM HEYETİSİN. Stratejist, Tekniker ve Eleştirmen'in otopsi raporlarını tarafsızca değerlendir. Hükmünü ver: ## KONSENSÜS / ## ANLAŞMAZLIK VE RİSKLER / ## NİHAİ BAŞHAKEM HÜKMÜ (Kodu Birleştir (Merge) / Veto / Şartlı Yama).`,
        },
        {
          role: "user",
          content: `${basePrompt}\nSTRATEJİST:\n${stratText}\n\nTEKNİKER:\n${engText}\n\nELEŞTİRMEN:\n${criticText}\n\nNihai hakem kararını ver.`,
        },
      ],
      onToken: (_t, full) => {
        setAutopsyOutputs((prev) => ({ ...prev, referee: full }));
      },
    });

    setRunning(false);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(codeContent);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1500);
  };

  const downloadPatch = () => {
    const patchContent = `# YAZILIM ADLİ TIP OTOPSİ YAMASI\n# Vaka: ${caseId}\n# Dosya: ${filename}\n# Tarih: ${new Date().toISOString()}\n\n${autopsyOutputs.engineer || codeContent}`;
    const blob = new Blob([patchContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.patch`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4 lg:flex-row">
      {/* Left Code Editor & File Ingestion Panel */}
      <Panel className="flex w-full shrink-0 flex-col lg:w-[500px]" glowColor="#0ea5e9">
        <PanelHeader
          accent="#0ea5e9"
          icon={<FileCode size={15} />}
          title={
            <div className="flex items-center gap-2">
              <span>YAZILIM ADLİ TIP VE KOD OTOPSİSİ</span>
              <span className="font-mono text-[10px] text-amber-400">[{caseId}]</span>
            </div>
          }
          right={
            <div className="flex items-center gap-1.5">
              <label className="flex items-center gap-1 cursor-pointer rounded-lg border border-[#2d3b4e] bg-[#131a26] px-2.5 py-1 text-[11px] font-mono text-[#8b9bb4] hover:border-white hover:text-white transition-colors">
                <Upload size={12} />
                <span>Dosya Yükle</span>
                <input
                  type="file"
                  accept=".py,.ts,.tsx,.js,.json,.diff,.patch,.sql,.yaml"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                onClick={() => {
                  setCodeContent(SAMPLE_PLATFORM_REGISTRY_PY);
                  setFilename("platform_registry.py");
                  setOperatorDirective(
                    "Commit 80e57f7d regresyonu: Instagram /p/ URL'leri neden unsupported_web dönüp 11 testi patlatıyor? Satır satır inceleyin ve çalışan yamayı verin."
                  );
                }}
                className="rounded-lg border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-2 py-1 text-[10.5px] font-mono text-[#f59e0b] hover:bg-[#f59e0b]/20 transition-colors"
                title="platform_registry.py test regresyon vakasını yükle"
              >
                Vaka 80e57f7d
              </button>
            </div>
          }
        />

        <div className="flex min-h-0 flex-1 flex-col p-3 space-y-2.5 overflow-y-auto">
          {/* Directive Input */}
          <div>
            <label className="font-mono text-[10px] uppercase tracking-wider text-[#8b9bb4] flex items-center justify-between">
              <span>Operatör İnceleme Direktifi</span>
              <span className="text-[#0ea5e9] font-semibold">4 Katmanlı Otopsi</span>
            </label>
            <TextArea
              rows={2}
              value={operatorDirective}
              onChange={(e) => setOperatorDirective(e.target.value)}
              className="mt-1 text-xs"
            />
          </div>

          {/* Mode Selector */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => setAutopsyMode("bug")}
              className={`flex items-center justify-center gap-1.5 rounded-lg border py-1.5 text-xs font-disp font-semibold transition-all ${
                autopsyMode === "bug"
                  ? "border-[#f43f5e] bg-[#f43f5e]/20 text-white shadow-sm shadow-rose-950/40"
                  : "border-[#1e293b] bg-[#0f1520] text-[#8b9bb4] hover:text-white"
              }`}
            >
              <Bug size={13} className={autopsyMode === "bug" ? "text-rose-400" : ""} />
              <span>Regresyon / Bug</span>
            </button>
            <button
              onClick={() => setAutopsyMode("arch")}
              className={`flex items-center justify-center gap-1.5 rounded-lg border py-1.5 text-xs font-disp font-semibold transition-all ${
                autopsyMode === "arch"
                  ? "border-[#0ea5e9] bg-[#0ea5e9]/20 text-white shadow-sm shadow-sky-950/40"
                  : "border-[#1e293b] bg-[#0f1520] text-[#8b9bb4] hover:text-white"
              }`}
            >
              <GitBranch size={13} className={autopsyMode === "arch" ? "text-sky-400" : ""} />
              <span>Mimari Sözleşme</span>
            </button>
            <button
              onClick={() => setAutopsyMode("security")}
              className={`flex items-center justify-center gap-1.5 rounded-lg border py-1.5 text-xs font-disp font-semibold transition-all ${
                autopsyMode === "security"
                  ? "border-[#a855f7] bg-[#a855f7]/20 text-white shadow-sm shadow-purple-950/40"
                  : "border-[#1e293b] bg-[#0f1520] text-[#8b9bb4] hover:text-white"
              }`}
            >
              <ShieldAlert size={13} className={autopsyMode === "security" ? "text-purple-400" : ""} />
              <span>Güvenlik &amp; Zafiyet</span>
            </button>
          </div>

          {/* Code Textarea with line counts */}
          <div className="flex-1 flex flex-col min-h-[260px]">
            <div className="flex items-center justify-between font-mono text-[10px] text-[#8b9bb4] pb-1.5 border-b border-[#1e293b]">
              <span className="flex items-center gap-2">
                <FileText size={12} className="text-[#0ea5e9]" />
                <b className="text-white">{filename}</b>
                <span className="opacity-70">({lines.length} satır · {codeContent.length} byte)</span>
              </span>
              <div className="flex gap-2">
                <button onClick={copyCode} className="hover:text-white transition-colors">
                  {copiedCode ? "Kopyalandı ✓" : "Kopyala"}
                </button>
              </div>
            </div>

            <div className="relative flex-1 mt-1.5 flex rounded-xl border border-[#1e293b] bg-[#05080c] overflow-hidden">
              {/* Line numbers gutter */}
              <div className="select-none border-r border-[#1e293b] bg-[#0a0e15] px-2 py-3 font-mono text-[11px] text-[#475569] text-right">
                {lines.map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              <textarea
                value={codeContent}
                onChange={(e) => setCodeContent(e.target.value)}
                spellCheck={false}
                className="flex-1 bg-transparent p-3 font-mono text-[11.5px] leading-relaxed text-[#38bdf8] outline-none resize-none whitespace-pre overflow-x-auto"
              />
            </div>
          </div>

          {/* Action Button */}
          <Button
            variant="emerald"
            className="w-full py-3 text-xs font-bold"
            onClick={handleRunAutopsy}
            disabled={running || !codeContent.trim()}
          >
            {running ? (
              <>
                <Flame size={14} className="animate-spin text-amber-300" />
                <span>Modeller Kodu Ameliyat Ediyor...</span>
              </>
            ) : (
              <>
                <Play size={14} />
                <span>Otopsiyi Başlat (3 Model + Hakem Kararı)</span>
              </>
            )}
          </Button>
        </div>
      </Panel>

      {/* Right Multilateral Dissection Results */}
      <Panel className="flex min-w-0 flex-1 flex-col overflow-hidden" glowColor="#10b981">
        <PanelHeader
          accent="#10b981"
          icon={<Scale size={15} />}
          title="YAZILIM ADLİ TIP TUTANAĞI & HÜKÜM MASASI"
          right={
            <div className="flex items-center gap-2">
              <Chip color={running ? "#0ea5e9" : autopsyOutputs.referee ? "#10b981" : undefined}>
                <StatusDot tone={running ? "#0ea5e9" : autopsyOutputs.referee ? "#10b981" : "#57606a"} pulse={running} />
                <span>{running ? "ameliyat sürüyor" : autopsyOutputs.referee ? "hüküm tescil edildi" : "dosya bekleniyor"}</span>
              </Chip>
              {autopsyOutputs.engineer && (
                <>
                  <Button size="sm" variant="outline" onClick={downloadPatch} title="Patch olarak indir">
                    <Download size={12} />
                    <span>.patch İndir</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onSendToCouncil(
                        `Kod Otopsisi [${caseId}]: ${filename} dosyasındaki ${operatorDirective}\nTekniker çözümü:\n${autopsyOutputs.engineer?.slice(0, 300)}`
                      )
                    }
                  >
                    <span>Konseye Aktar</span>
                  </Button>
                </>
              )}
            </div>
          }
        />

        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {!autopsyOutputs.strategist && !running ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center text-[#8b9bb4]">
              <div className="mb-3 grid h-16 w-16 place-items-center rounded-2xl border border-[#1e293b] bg-[#0f1520] text-[#10b981] shadow-xl shadow-emerald-950/20">
                <Code2 size={32} />
              </div>
              <h3 className="font-disp text-base font-bold text-white">Yazılım Otopsi Masası Hazır</h3>
              <p className="mt-1.5 max-w-lg text-xs leading-relaxed text-[#8b9bb4]">
                Soldaki editöre bir kaynak kod veya <code>git diff</code> yapıştırın (veya dosya yükleyin).
                <b>“Otopsiyi Başlat”</b> dediğinizde:
              </p>
              <div className="mt-3 grid max-w-md grid-cols-2 gap-2 text-left font-mono text-[10.5px]">
                <div className="rounded border border-[#1e293b] bg-[#0a0e15] p-2">
                  <b className="text-[#a855f7]">1. Stratejist:</b> Mimari sözleşme &amp; API sınır kontrolü
                </div>
                <div className="rounded border border-[#1e293b] bg-[#0a0e15] p-2">
                  <b className="text-[#0ea5e9]">2. Tekniker:</b> Çalışan somut diff &amp; kod yaması
                </div>
                <div className="rounded border border-[#1e293b] bg-[#0a0e15] p-2">
                  <b className="text-[#f43f5e]">3. Eleştirmen:</b> Uç durumlar, sahte başarı &amp; test açığı
                </div>
                <div className="rounded border border-[#1e293b] bg-[#0a0e15] p-2">
                  <b className="text-[#f59e0b]">4. Başhakem:</b> Hüküm: Merge / Veto / Şartlı Geçiş
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Official Judicial Verdict Header (Embossed Seal) */}
              {autopsyOutputs.referee && (
                <div className="rounded-xl border-2 border-[#f59e0b]/50 bg-gradient-to-r from-[#1c1407] to-[#0f1520] p-4 shadow-2xl">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f59e0b]/30 pb-3">
                    <div className="flex items-center gap-2">
                      <Gavel size={18} className="text-[#f59e0b]" />
                      <span className="font-disp text-sm font-bold tracking-wide text-white">
                        RESMİ BAŞHAKEM HÜKÜM MÜHRÜ
                      </span>
                    </div>
                    <div className="verdict-seal">
                      <ShieldCheck size={14} className="text-[#f59e0b]" />
                      <span>{caseId} TESCİLLENDİ</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <MarkdownView content={autopsyOutputs.referee} />
                  </div>
                </div>
              )}

              {/* Model B - Tekniker (Code Patch) */}
              {autopsyOutputs.engineer && (
                <div className="rounded-xl border border-[#0ea5e9]/40 bg-[#09131d] p-3.5 shadow-sm">
                  <div className="mb-2 flex items-center justify-between border-b border-[#0ea5e9]/20 pb-1.5 font-disp text-xs font-bold text-[#0ea5e9]">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#0ea5e9]" />
                      <span>MODEL B · TEKNİKER (SOMUT YAMA VE ÇALIŞAN KOD)</span>
                    </div>
                    <Chip color="#0ea5e9">Çözüm Yaması</Chip>
                  </div>
                  <MarkdownView content={autopsyOutputs.engineer} />
                </div>
              )}

              {/* Model C - Eleştirmen */}
              {autopsyOutputs.critic && (
                <div className="rounded-xl border border-[#f43f5e]/40 bg-[#190b10] p-3.5 shadow-sm">
                  <div className="mb-2 flex items-center justify-between border-b border-[#f43f5e]/20 pb-1.5 font-disp text-xs font-bold text-[#f43f5e]">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#f43f5e]" />
                      <span>MODEL C · ELEŞTİRMEN (AÇIK, KÖR NOKTA VE TEST DENETİMİ)</span>
                    </div>
                    <Chip color="#f43f5e">Zafiyet &amp; Veto</Chip>
                  </div>
                  <MarkdownView content={autopsyOutputs.critic} />
                </div>
              )}

              {/* Model A - Stratejist */}
              {autopsyOutputs.strategist && (
                <div className="rounded-xl border border-[#a855f7]/40 bg-[#120a1a] p-3.5 shadow-sm">
                  <div className="mb-2 flex items-center justify-between border-b border-[#a855f7]/20 pb-1.5 font-disp text-xs font-bold text-[#a855f7]">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#a855f7]" />
                      <span>MODEL A · STRATEJİST (MİMARİ VE SÖZLEŞME DENETİMİ)</span>
                    </div>
                    <Chip color="#a855f7">Mimari Teşhis</Chip>
                  </div>
                  <MarkdownView content={autopsyOutputs.strategist} />
                </div>
              )}
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
