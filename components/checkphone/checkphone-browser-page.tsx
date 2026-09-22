"use client";

import { useEffect, useState } from "react";
import { useCheckPhoneRefresh } from "@/lib/checkphone-refresh-tracker";
import { ChevronLeft, RefreshCw, Search, Trash2, Clock, Bookmark, Globe } from "lucide-react";
import { CheckPhoneBilingualText } from "@/components/checkphone/checkphone-bilingual-text";
import { CheckPhoneDebugErrorCard } from "@/components/checkphone/checkphone-debug-error-card";
import { ConfirmDialog } from "@/components/ui";
import type { Character } from "@/lib/character-types";
import type {
  CheckPhoneBrowserPayload,
  CheckPhoneSnapshot,
} from "@/lib/checkphone-config";
import { generateCheckPhoneBrowser } from "@/lib/checkphone-engine";
import { clearPhoneSnapshot, loadPhoneSnapshot, savePhoneSnapshot } from "@/lib/checkphone-storage";
import { formatChatUiTime } from "@/lib/chat-time";

type CheckPhoneBrowserPageProps = {
  character: Character;
  onBack: () => void;
};

export function CheckPhoneBrowserPage({ character, onBack }: CheckPhoneBrowserPageProps) {
  const [snapshot, setSnapshot] = useState<CheckPhoneSnapshot<CheckPhoneBrowserPayload> | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useCheckPhoneRefresh(character.id, "browser", setSnapshot);
  const [error, setError] = useState<string | null>(null);
  const [debugRawOutput, setDebugRawOutput] = useState<string | null>(null);
  const [debugSanitizedOutput, setDebugSanitizedOutput] = useState<string | null>(null);
  const [debugParseMode, setDebugParseMode] = useState<"raw" | "sanitized" | "failed" | null>(null);
  const [debugParseError, setDebugParseError] = useState<string | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"history" | "bookmarks">("history");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  function toggleExpand(id: string) {
    setExpandedId(prev => prev === id ? null : id);
  }

  const handleForwardBrowserItem = async (title: string, urlLabel: string, content: string) => {
    if (!(window as any).AiPhone) return;
    try {
      await (window as any).AiPhone.chat.sendCard({
        characterId: character.id,
        role: "user",
        summary: `你转发了一条浏览器历史记录向对方对质。`,
        historyText: `[截屏对质：你把在对方手机上截获到的浏览器历史/收藏记录转发给TA，内容是：“${title} - ${content.substring(0, 100)}”，并要求TA合理解释！]`,
        card: {
          appLabel: "查手机 · 浏览器对质",
          title: "📌 截屏对质单",
          subtitle: "BROWSER EVIDENCE",
          status: "等待回应",
          accentColor: "#007aff",
          sections: [
            { title: "对质证据", rows: [
              { label: "网页标题", value: title.substring(0, 30) },
              { label: "网址", value: urlLabel }
            ] }
          ],
          actions: [{ label: "开始对质和核实" }]
        }
      });
      await (window as any).AiPhone.ui.toast("浏览器证据卡片已同步至对质聊天！");
      await (window as any).AiPhone.chat.requestReply({ characterId: character.id });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setError(null);
    setSnapshot(null);
    setDebugRawOutput(null);
    setDebugSanitizedOutput(null);
    setDebugParseMode(null);
    setDebugParseError(null);
    (async () => {
      const cached = await loadPhoneSnapshot<CheckPhoneBrowserPayload>(character.id, "browser");
      if (cancelled) return;
      setSnapshot(cached);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [character.id]);

  async function handleRefresh() {
    if (loading) return;
    setLoading(true);
    setError(null);
    setDebugRawOutput(null);
    setDebugSanitizedOutput(null);
    setDebugParseMode(null);
    setDebugParseError(null);
    const {
      payload,
      summary,
      error: nextError,
      debugRawOutput: nextDebugRawOutput,
      debugSanitizedOutput: nextDebugSanitizedOutput,
      debugParseMode: nextDebugParseMode,
      debugParseError: nextDebugParseError,
    } = await generateCheckPhoneBrowser(character.id, snapshot?.payload ?? null, snapshot?.updatedAt);
    if (payload) {
      const now = new Date().toISOString();
      const nextSnapshot: CheckPhoneSnapshot<CheckPhoneBrowserPayload> = {
        id: `${character.id}:browser`,
        characterId: character.id,
        appId: "browser",
        generatedAt: snapshot?.generatedAt ?? now,
        updatedAt: now,
        summary,
        payload,
      };
      await savePhoneSnapshot(nextSnapshot);
      setSnapshot(nextSnapshot);
    }
    setError(nextError ?? null);
    setDebugRawOutput(nextDebugRawOutput ?? null);
    setDebugSanitizedOutput(nextDebugSanitizedOutput ?? null);
    setDebugParseMode(nextDebugParseMode ?? null);
    setDebugParseError(nextDebugParseError ?? null);
    setLoading(false);
    setLoaded(true);
  }

  async function handleClear() {
    if (loading) return;
    await clearPhoneSnapshot(character.id, "browser");
    setSnapshot(null);
    setError(null);
    setDebugRawOutput(null);
    setDebugSanitizedOutput(null);
    setDebugParseMode(null);
    setDebugParseError(null);
    setLoaded(true);
    setConfirmClearOpen(false);
  }

  const payload = snapshot?.payload ?? null;
  const history = payload?.history ?? [];
  const bookmarks = payload?.bookmarks ?? [];

  return (
    <div className="cp-browser-module">
      {/* Light Aurora Background Layer */}
      <div className="cp-browser-aurora-bg">
        <div className="cp-aurora-orb cp-aurora-orb-1"></div>
        <div className="cp-aurora-orb cp-aurora-orb-2"></div>
        <div className="cp-aurora-orb cp-aurora-orb-3"></div>
      </div>

      <header className="cp-browser-appbar cp-browser-appbar--unified">
        <div className="cp-browser-unified-compact">
          <div className="cp-unified-header-left">
            <button type="button" className="cp-unified-btn" onClick={onBack} aria-label="Back">
              <ChevronLeft size={20} strokeWidth={2.5} />
            </button>
          </div>

          <div className="cp-unified-title-stack">
            <div className="cp-unified-title-row">
              <i className="cp-unified-blink"></i>
              <span className="cp-unified-title">{payload?.headerTitle || "浏览器"}</span>
            </div>
            <div className="cp-unified-subtitle">{payload?.headerSubtitle || "历史记录与收藏夹"}</div>
          </div>

          <div className="cp-unified-header-right">
            <div className="cp-unified-actions">
              <button type="button" className="cp-unified-btn" onClick={handleRefresh} disabled={loading} aria-label="Refresh">
                <RefreshCw size={16} strokeWidth={2.5} className={loading ? "cp-spin" : ""} />
              </button>
              <button
                type="button"
                className="cp-unified-btn cp-unified-btn--danger"
                onClick={() => setConfirmClearOpen(true)}
                disabled={loading || !snapshot}
                aria-label="Clear browser snapshot"
              >
                <Trash2 size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
        
        <div className="cp-unified-status-bar">
          <span className="cp-unified-mini-text">[ SYS.NET : ONLINE ]</span>
          <span className="cp-unified-mini-text">SEC 9 {">"} PORT 443</span>
        </div>
      </header>

      {loading && (
        <div className="cp-refresh-indicator cp-refresh-indicator--floating" aria-live="polite">
          <span className="cp-refresh-indicator-text">正在刷新浏览器</span>
          <span className="cp-refresh-indicator-dots" aria-hidden="true">
            <i></i><i></i><i></i>
          </span>
        </div>
      )}

      <div className="cp-browser-body">
        <div className="cp-browser-scroll">
          <div className="cp-browser-searchbar-dymo">
            <div className="cp-dymo-tape">
              <span>[ SEARCH / INPUT URL ]</span>
            </div>
          </div>

        {!loaded && <div className="cp-browser-status">Reading browser...</div>}

        {loaded && !payload && !loading && (
          <div className="cp-browser-status cp-empty-copy">
            <p>暂无浏览内容</p>
            <span className="cp-browser-hint">点刷新同步历史记录和收藏夹</span>
          </div>
        )}

        {error ? (
          <CheckPhoneDebugErrorCard
            title="暂时无法解析浏览器内容。"
            error={error}
            debugParseMode={debugParseMode}
            debugParseError={debugParseError}
            debugRawOutput={debugRawOutput}
            debugSanitizedOutput={debugSanitizedOutput}
          />
        ) : null}

        {payload && (
          <>
            {selectedItem ? (
              /* 二级详情页：模仿发帖提问与网友评论排版 */
              <div className="flex flex-col bg-[#f9f9f9] text-black select-none relative z-50 animate-in fade-in slide-in-from-right-4 duration-200 min-h-full" style={{ margin: '-16px -16px 0', padding: '0' }}>
                <header className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06] bg-white shrink-0">
                  <button 
                    type="button" 
                    onClick={() => setSelectedItem(null)} 
                    className="flex items-center gap-1 text-black/70 hover:text-black font-semibold text-sm"
                  >
                    <ChevronLeft size={18} strokeWidth={2.5} />
                    <span>返回</span>
                  </button>
                  <span className="font-bold text-sm text-black/80">搜索结果</span>
                  <div className="w-10"></div>
                </header>

                <div className="flex-1 overflow-y-auto pb-24">
                  <div className="bg-white px-5 pt-5 pb-6 mb-2 border-b border-black/[0.04]">
                    <h2 className="text-[19px] font-bold text-black/90 leading-snug mb-4">
                      <CheckPhoneBilingualText text={selectedItem.title} tone="browser" />
                    </h2>

                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-full bg-black/10 flex items-center justify-center text-black/40 shrink-0">
                        <Globe size={20} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[13px] font-bold text-black/80">匿名用户</span>
                        <div className="flex gap-3 text-[11px] text-black/40 mt-0.5">
                          <span>👁️ {(parseInt(selectedItem.id.replace(/\D/g, '')) || 3) * 128 + 432} 浏览</span>
                          <span>❤️ {(parseInt(selectedItem.id.replace(/\D/g, '')) || 2) * 45 + 12} 赞</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-[15px] leading-relaxed text-black/80 whitespace-pre-wrap select-text tracking-wide">
                      <CheckPhoneBilingualText text={selectedItem.content} tone="browser" />
                    </div>
                  </div>

                  {(selectedItem.context || selectedItem.innerThought) && (
                    <div className="mx-4 p-3 bg-blue-50/50 border border-blue-100/40 rounded-xl mb-3 flex flex-col gap-2">
                      {selectedItem.context && (
                        <div className="text-xs text-blue-600/80 leading-relaxed">
                          <span className="font-bold mr-1">情境:</span>
                          <CheckPhoneBilingualText text={selectedItem.context} tone="browser" />
                        </div>
                      )}
                      {selectedItem.innerThought && (
                        <div className="text-xs text-blue-600/80 leading-relaxed">
                          <span className="font-bold mr-1">内心想法:</span>
                          <CheckPhoneBilingualText text={selectedItem.innerThought} tone="browser" />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="bg-white border-y border-black/[0.04]">
                    <div className="px-5 py-3.5 border-b border-black/[0.03] flex items-center justify-between">
                      <span className="text-[15px] font-bold text-black/80 flex items-center gap-1.5">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-black/30">
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                        </svg>
                        评论 ({selectedItem.comments?.length || 0})
                      </span>
                    </div>

                    <div className="flex flex-col">
                      {selectedItem.comments && selectedItem.comments.length > 0 ? (
                        selectedItem.comments.map((comment, index) => (
                          <div key={comment.id || index} className="flex gap-3 px-5 py-4 border-b border-black/[0.03] last:border-b-0">
                            <div className="w-8 h-8 rounded-full bg-black/5 flex-shrink-0 flex items-center justify-center text-black/30 mt-0.5">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                <circle cx="12" cy="7" r="4"/>
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-baseline mb-1">
                                <span className="text-[13px] font-bold text-black/70">{comment.authorName}</span>
                                <span className="text-[10px] text-black/30">{index === 0 ? '2小时前' : index === 1 ? '1小时前' : '30分钟前'}</span>
                              </div>
                              <p className="text-[14px] text-black/90 leading-relaxed">
                                <CheckPhoneBilingualText text={comment.text} tone="browser" />
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-[13px] text-black/30 text-center py-8">暂无网友评论</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-4 left-4 right-4 z-20">
                  <button 
                    type="button" 
                    onClick={() => handleForwardBrowserItem(selectedItem.title, selectedItem.urlLabel, selectedItem.content || "")}
                    className="w-full py-3 rounded-xl bg-blue-500 text-white font-semibold text-xs shadow-lg hover:bg-blue-600 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    🔗 转发本页证据和TA对质
                  </button>
                </div>
              </div>
            ) : (
              /* 极简历史记录列表：模仿图一小清爽时钟风格 */
              <>
                <div className="cp-browser-tabs-folder">
                  <button 
                    type="button" 
                    className={`cp-folder-tab ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                  >
                    历史记录
                  </button>
                  <button 
                    type="button" 
                    className={`cp-folder-tab ${activeTab === 'bookmarks' ? 'active' : ''}`}
                    onClick={() => setActiveTab('bookmarks')}
                  >
                    收藏夹
                  </button>
                </div>

                <div className="cp-browser-list" style={{ padding: '0 16px', marginTop: '12px' }}>
                    {activeTab === 'history' && history.length === 0 && (
                      <div className="cp-browser-empty-list">无历史记录</div>
                    )}
                    {activeTab === 'bookmarks' && bookmarks.length === 0 && (
                      <div className="cp-browser-empty-list">无收藏记录</div>
                    )}

                    {activeTab === 'history' && history.map((item) => (
                      <button 
                        key={item.id} 
                        type="button"
                        onClick={() => setSelectedItem(item)}
                        className="w-full flex items-center gap-3.5 py-3.5 border-b border-black/[0.04] text-left active:bg-black/[0.02] transition-colors"
                      >
                        <div className="w-9 h-9 rounded-full bg-black/[0.04] flex items-center justify-center text-black/40 shrink-0">
                          <Clock size={17} />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                          <h4 className="text-sm font-medium text-black/80 truncate">
                            <CheckPhoneBilingualText text={item.title} tone="browser" variant="inline" />
                          </h4>
                          <time className="text-[11px] text-black/40">
                            {formatChatUiTime(item.createdAt) || item.createdAt}
                          </time>
                        </div>
                        <div className="text-black/20 pr-1 shrink-0">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </div>
                      </button>
                    ))}

                    {activeTab === 'bookmarks' && bookmarks.map((item) => (
                      <button 
                        key={item.id} 
                        type="button"
                        onClick={() => setSelectedItem({
                          id: item.id,
                          title: item.title,
                          urlLabel: item.urlLabel,
                          createdAt: '收藏夹',
                          content: item.content || '暂无详细介绍',
                          context: item.categoryLabel,
                          innerThought: item.reason,
                          comments: []
                        })}
                        className="w-full flex items-center gap-3.5 py-3.5 border-b border-black/[0.04] text-left active:bg-black/[0.02] transition-colors"
                      >
                        <div className="w-9 h-9 rounded-full bg-black/[0.04] flex items-center justify-center text-black/40 shrink-0">
                          <Bookmark size={17} />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                          <h4 className="text-sm font-medium text-black/80 truncate">
                            <CheckPhoneBilingualText text={item.title} tone="browser" variant="inline" />
                          </h4>
                          <span className="text-[10px] bg-black/[0.05] text-black/50 rounded px-1.5 py-0.5 self-start">
                            {item.categoryLabel}
                          </span>
                        </div>
                        <div className="text-black/20 pr-1 shrink-0">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </div>
                      </button>
                    ))}
                  </div>
              </>
            )}
          </>
        )}
        </div>
      </div>
      {confirmClearOpen && (
        <ConfirmDialog
          title="清空浏览器内容？"
          message="确认后会清空当前浏览器缓存。之后重新刷新时，不会再带入旧浏览内容。"
          variant="danger"
          confirmLabel="确认清空"
          cancelLabel="取消"
          onConfirm={handleClear}
          onCancel={() => setConfirmClearOpen(false)}
        />
      )}
    </div>
  );
}
