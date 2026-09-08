import React, { useEffect, useRef, useState } from "react";
import { api } from "@/api/client";
import { Menu, MoreVertical, Sparkles, Smartphone } from "lucide-react";
import Sidebar from "@/components/xgpt/Sidebar";
import MessageBubble from "@/components/xgpt/MessageBubble";
import Composer from "@/components/xgpt/Composer";
import TypingDots from "@/components/xgpt/TypingDots";
import ImageLoading from "@/components/xgpt/ImageLoading";
import EmptyState from "@/components/xgpt/EmptyState";
import ContextMenu from "@/components/xgpt/ContextMenu";
import LimitUpgradeModal from "@/components/xgpt/LimitUpgradeModal";
import { isAdminUser } from "@/lib/adminEmails";
import {
  getSetting,
  getCurrentUser,
  getDailyMessageCount,
  incrementMessageCount,
  checkPremium,
  isImageRequest,
  isDocumentationRequest,
  getDailyImageCount,
  incrementImageCount,
  getDailyFileCount,
  incrementFileCount,
  getDailyDocumentationCount,
  incrementDocumentationCount,
  FREE_DAILY_LIMIT,
  FREE_IMAGE_LIMIT,
  FREE_FILE_LIMIT,
  FREE_DOCUMENTATION_LIMIT,
} from "@/lib/settings";

export default function Chat() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [thinking, setThinking] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ctxMenuOpen, setCtxMenuOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [limitTypes, setLimitTypes] = useState([]);
  const [upgradeReason, setUpgradeReason] = useState("limit");
  const endRef = useRef(null);

  useEffect(() => {
    Promise.all([checkPremium(), getCurrentUser()]).then(([premium, user]) => {
      setIsPremium(premium);
      setIsAdmin(isAdminUser(user));
    });
  }, []);

  const loadConversations = async () => setConversations(await api.entities.Conversation.list("-created_date", 50));
  useEffect(() => { loadConversations(); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, thinking, imageLoading]);

  const openConversation = async (id) => {
    setActiveId(id);
    setSidebarOpen(false);
    setMessages(await api.entities.Message.filter({ conversation_id: id }, "created_date"));
  };

  const newChat = () => { setActiveId(null); setMessages([]); setSidebarOpen(false); };

  const deleteConversation = async (id) => {
    await api.entities.Message.deleteMany({ conversation_id: id });
    await api.entities.Conversation.delete(id);
    if (id === activeId) newChat();
    loadConversations();
  };

  const showLimit = (types) => {
    setLimitTypes([...new Set(types)]);
    setUpgradeReason("limit");
    setUpgradeOpen(true);
  };

  const send = async (text, attachedFiles = []) => {
    if (isAdmin) {
      // Admin accounts have unlimited access and never need Premium.
    }

    const isImage = isImageRequest(text);
    const isDocumentation = !isImage && isDocumentationRequest(text);
    const blocked = [];

    if (!isAdmin && !isPremium) {
      if (isImage && getDailyImageCount() >= FREE_IMAGE_LIMIT) blocked.push("Image generation");
      if (!isImage && !isDocumentation && getDailyMessageCount() >= FREE_DAILY_LIMIT) blocked.push("AI messages");
      if (isDocumentation && getDailyDocumentationCount() >= FREE_DOCUMENTATION_LIMIT) blocked.push("Documentation");
      if (attachedFiles.length && getDailyFileCount() + attachedFiles.length > FREE_FILE_LIMIT) blocked.push("File uploads");
    }

    if (blocked.length) {
      showLimit(blocked);
      return;
    }

    let convoId = activeId;
    if (!convoId) {
      const convo = await api.entities.Conversation.create({ title: text ? (text.length > 40 ? text.slice(0, 40) + "…" : text) : "Uploaded files" });
      convoId = convo.id;
      setActiveId(convoId);
      loadConversations();
    }

    const uploadedUrls = [];
    for (const file of attachedFiles) {
      const { file_url } = await api.integrations.Core.UploadFile({ file });
      uploadedUrls.push(file_url);
    }

    if (uploadedUrls.length && !isAdmin && !isPremium) {
      incrementFileCount(uploadedUrls.length);
      setUpgradeReason("upload");
      setLimitTypes([]);
      setUpgradeOpen(true);
    }

    const history = [...messages, { role: "user", content: text, file_urls: uploadedUrls }];
    setMessages(history);
    await api.entities.Message.create({ conversation_id: convoId, role: "user", content: text, file_urls: uploadedUrls });

    if (isImage) {
      setImageLoading(true);
      if (!isAdmin && !isPremium) incrementImageCount();
      try {
        const res = await api.functions.invoke("generateImage", { prompt: text });
        const imageUrl = res.data?.url;
        if (imageUrl) {
          await api.entities.Message.create({ conversation_id: convoId, role: "assistant", content: "", file_urls: [imageUrl] });
          setMessages([...history, { role: "assistant", content: "", file_urls: [imageUrl] }]);
        } else {
          const errMsg = res.data?.error || "Could not generate image.";
          await api.entities.Message.create({ conversation_id: convoId, role: "assistant", content: errMsg });
          setMessages([...history, { role: "assistant", content: errMsg }]);
        }
      } catch (e) {
        const errMsg = e.message || "Something went wrong.";
        await api.entities.Message.create({ conversation_id: convoId, role: "assistant", content: errMsg });
        setMessages([...history, { role: "assistant", content: errMsg }]);
      }
      setImageLoading(false);
    } else {
      setThinking(true);
      if (!isAdmin && !isPremium) {
        if (isDocumentation) incrementDocumentationCount();
        else incrementMessageCount();
      }
      try {
        const res = await api.functions.invoke("xgptChat", {
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          persona: getSetting("persona", "concise"),
          system_prompt: getSetting("systemPrompt", ""),
          file_urls: uploadedUrls,
        });
        const reply = res.data?.reply || "Something went wrong generating a reply.";
        await api.entities.Message.create({ conversation_id: convoId, role: "assistant", content: reply });
        setMessages([...history, { role: "assistant", content: reply }]);
      } catch (e) {
        const errMsg = e.message || "Something went wrong.";
        await api.entities.Message.create({ conversation_id: convoId, role: "assistant", content: errMsg });
        setMessages([...history, { role: "assistant", content: errMsg }]);
      }
      setThinking(false);
    }
  };

  const remaining = isAdmin || isPremium ? null : (
    `${Math.max(0, FREE_DAILY_LIMIT - getDailyMessageCount())} messages · ${Math.max(0, FREE_IMAGE_LIMIT - getDailyImageCount())} images · ${Math.max(0, FREE_FILE_LIMIT - getDailyFileCount())} files · ${Math.max(0, FREE_DOCUMENTATION_LIMIT - getDailyDocumentationCount())} docs left today.`
  );

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-100 selection:bg-white selection:text-black">
      <Sidebar conversations={conversations} activeId={activeId} onSelect={openConversation} onNew={newChat} onDelete={deleteConversation} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-h-screen flex-col md:pl-72">
        <header className="flex items-center gap-3 border-b border-white/10 bg-black/20 px-5 py-3 backdrop-blur-xl md:hidden">
          <button onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5 text-neutral-400" /></button>
          <span className="font-display tracking-tight">x<span className="text-neutral-500">GPT</span></span>
          <div className="ml-auto flex items-center gap-1">
            <a href="/download" title="Get the App" className="grid h-8 w-8 place-items-center rounded-lg text-neutral-400 hover:bg-white/5 hover:text-white"><Smartphone className="h-4 w-4" /></a>
            {!isAdmin && <button onClick={() => { setLimitTypes([]); setUpgradeReason("upload"); setUpgradeOpen(true); }} className="grid h-8 w-8 place-items-center rounded-lg text-neutral-400 hover:bg-white/5 hover:text-white" title="Premium"><Sparkles className="h-4 w-4" /></button>}
            <button onClick={() => setCtxMenuOpen(!ctxMenuOpen)} className="grid h-8 w-8 place-items-center rounded-lg text-neutral-400 hover:bg-white/5 hover:text-white"><MoreVertical className="h-4 w-4" /></button>
            <ContextMenu open={ctxMenuOpen} onClose={() => setCtxMenuOpen(false)} onClearChat={newChat} />
          </div>
        </header>

        <header className="hidden items-center justify-end gap-2 border-b border-white/10 bg-black/20 px-6 py-3 backdrop-blur-xl md:flex">
          <a href="/download" className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-1.5 text-xs text-neutral-300 hover:bg-white/5 hover:text-white"><Smartphone className="h-3.5 w-3.5" /> Get the App</a>
          {isAdmin ? <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white">Admin • unlimited access</span> : <button onClick={() => { setLimitTypes([]); setUpgradeReason("upload"); setUpgradeOpen(true); }} className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-1.5 text-xs text-neutral-300 hover:bg-white/5 hover:text-white"><Sparkles className="h-3.5 w-3.5" /> Premium</button>}
          <button onClick={() => setCtxMenuOpen(!ctxMenuOpen)} className="grid h-8 w-8 place-items-center rounded-xl text-neutral-400 hover:bg-white/5 hover:text-white"><MoreVertical className="h-4 w-4" /></button>
          <ContextMenu open={ctxMenuOpen} onClose={() => setCtxMenuOpen(false)} onClearChat={newChat} />
        </header>

        <main className="flex-1">
          {messages.length === 0 && !thinking && !imageLoading ? <div className="h-[calc(100vh-9rem)]"><EmptyState onPick={send} /></div> : <div className="mx-auto w-full max-w-3xl space-y-5 px-5 py-10">{messages.map((m, i) => <MessageBubble key={m.id || i} role={m.role} content={m.content} file_urls={m.file_urls} />)}{thinking && <TypingDots />}{imageLoading && <ImageLoading />}<div ref={endRef} /></div>}
        </main>

        <div className="sticky bottom-0 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent pb-6 pt-4">
          <div className="mx-auto w-full max-w-3xl px-5">
            <Composer onSend={send} disabled={thinking || imageLoading} />
            {remaining && <p className="mt-3 text-center text-[11px] text-neutral-600">{remaining} <a href="/premium" className="underline hover:text-neutral-300">Upgrade for more</a></p>}
            {(isPremium || isAdmin) && <p className="mt-3 text-center text-[11px] text-neutral-600">{isAdmin ? "Admin access • unlimited service usage." : "xGPT can make mistakes. Verify important information."}</p>}
          </div>
        </div>
      </div>

      <LimitUpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} reached={limitTypes} uploaded={upgradeReason === "upload"} />
    </div>
  );
}
