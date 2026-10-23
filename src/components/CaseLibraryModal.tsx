import React, { useState } from "react";
import { CASE_LIBRARY, CaseScenario } from "../data/caseLibrary";
import { RoomId } from "../types";

interface CaseLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoom: RoomId;
  onSelectCase: (scenario: CaseScenario) => void;
}

export function CaseLibraryModal({
  isOpen,
  onClose,
  currentRoom,
  onSelectCase,
}: CaseLibraryModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("Tümü");
  const [searchQuery, setSearchQuery] = useState("");
  const [activePreview, setActivePreview] = useState<CaseScenario | null>(CASE_LIBRARY[0] || null);

  if (!isOpen) return null;

  const categories = [
    "Tümü",
    "Girişim & Yatırım",
    "İletişim & WhatsApp",
    "Felaket & Kriz",
    "Felsefe & İkilem",
    "Ağır Ceza & Hukuk",
  ];

  const filtered = CASE_LIBRARY.filter((c) => {
    const matchesCat = selectedCategory === "Tümü" || c.category === selectedCategory;
    const matchesQuery =
      searchQuery.trim() === "" ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesQuery;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center text-xl shadow-lg shadow-amber-500/10">
              ⚡
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Gerçek Hayat Kriz & Vaka Kütüphanesi
                <span className="text-xs font-normal text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
                  {CASE_LIBRARY.length} Hazır Dosya
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Tek tıkla gerçeğe dayalı kriz senaryolarını masaya yatırın, modellerin tepkilerini izleyin.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-2 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Filter bar */}
        <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  selectedCategory === cat
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative min-w-[240px]">
            <input
              type="text"
              placeholder="Vaka veya etiket ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1.5 text-xs text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Content: List + Preview */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0 overflow-hidden">
          {/* Case List */}
          <div className="md:col-span-5 border-r border-slate-800/80 overflow-y-auto p-4 space-y-2.5 bg-slate-950/30">
            {filtered.map((item) => {
              const isSelected = activePreview?.id === item.id;
              const isTargetMatch = item.targetRoom === currentRoom;
              return (
                <div
                  key={item.id}
                  onClick={() => setActivePreview(item)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                    isSelected
                      ? "bg-slate-800/90 border-amber-500/60 shadow-md ring-1 ring-amber-500/30"
                      : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-semibold text-amber-400/90 bg-amber-400/10 px-2 py-0.5 rounded">
                      {item.badge}
                    </span>
                    {isTargetMatch && (
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        Bu Oda İçin İdeal
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-slate-200 line-clamp-2 mb-1">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    {item.summary}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.tags.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-xs">
                Aramanıza uygun vaka bulunamadı.
              </div>
            )}
          </div>

          {/* Case Detail Preview */}
          <div className="md:col-span-7 flex flex-col h-full overflow-hidden bg-slate-900/40 p-6">
            {activePreview ? (
              <div className="flex-1 flex flex-col overflow-y-auto pr-2 space-y-4">
                <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-xs font-semibold text-amber-400 tracking-wider uppercase">
                      {activePreview.category}
                    </span>
                    <h3 className="text-base font-black text-slate-100 mt-0.5">
                      {activePreview.title}
                    </h3>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 font-medium">
                    {activePreview.badge}
                  </span>
                </div>

                <div>
                  <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    📋 Vaka & Kriz Detayı
                  </h5>
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {activePreview.content}
                  </div>
                </div>

                <div>
                  <h5 className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-1.5">
                    🎯 Masaya Sorulacak Kritik Soru
                  </h5>
                  <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-3.5 text-xs text-amber-200/90 font-medium leading-relaxed">
                    {activePreview.question}
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex flex-wrap gap-1.5">
                    {activePreview.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-400 border border-slate-700/50"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
                İncelemek için sol taraftan bir vaka seçin.
              </div>
            )}

            {/* Bottom Actions */}
            {activePreview && (
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                >
                  Vazgeç
                </button>
                <button
                  onClick={() => {
                    onSelectCase(activePreview);
                    onClose();
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-lg shadow-amber-500/20 flex items-center gap-2 transition transform active:scale-95"
                >
                  <span>📥 Vakayı Odaya Aktar ve Tartışmayı Başlat</span>
                  <span>→</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
