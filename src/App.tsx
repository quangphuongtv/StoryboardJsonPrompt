/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Clapperboard, 
  Send, 
  Copy, 
  Check, 
  User, 
  Camera, 
  Settings, 
  Film, 
  ChevronRight,
  ChevronDown,
  RefreshCcw,
  Sparkles,
  Download,
  Key,
  X,
  Mic,
  Volume2,
  Play,
  Loader2,
  Globe
} from "lucide-react";
import { generateStoryPlan, generateIndividualScene, StoryPlan, Scene, Shot, generateTTS, Character } from "./services/gemini.ts";

const GEMINI_VOICES = [
  { id: 'Puck', name: 'Puck', gender: 'Nam', expression: 'Năng động' },
  { id: 'Charon', name: 'Charon', gender: 'Nam', expression: 'Điềm tĩnh' },
  { id: 'Kore', name: 'Kore', gender: 'Nữ', expression: 'Dễ thương' },
  { id: 'Fenrir', name: 'Fenrir', gender: 'Nam', expression: 'Mạnh mẽ' },
  { id: 'Zephyr', name: 'Zephyr', gender: 'Nữ', expression: 'Nhẹ nhàng' },
  { id: 'Aoede', name: 'Aoede', gender: 'Nữ', expression: 'Trữ tình' },
  { id: 'Ersa', name: 'Ersa', gender: 'Nữ', expression: 'Tươi mới' },
  { id: 'Icarus', name: 'Icarus', gender: 'Nam', expression: 'Nhiệt huyết' },
  { id: 'Mimas', name: 'Mimas', gender: 'Nam', expression: 'Trầm ấm' },
  { id: 'Luna', name: 'Luna', gender: 'Nữ', expression: 'Bí ẩn' },
  { id: 'Sol', name: 'Sol', gender: 'Nam', expression: 'Rạng rỡ' },
  { id: 'Terra', name: 'Terra', gender: 'Nữ', expression: 'Vững chãi' },
  { id: 'Aether', name: 'Aether', gender: 'Nam', expression: 'Thanh thoát' },
  { id: 'Eros', name: 'Eros', gender: 'Nam', expression: 'Quyến rũ' },
  { id: 'Hestia', name: 'Hestia', gender: 'Nữ', expression: 'Ấm áp' },
  { id: 'Nyus', name: 'Nyus', gender: 'Nam', expression: 'Sâu sắc' },
  { id: 'Iris', name: 'Iris', gender: 'Nữ', expression: 'Đa sắc' },
  { id: 'Atlas', name: 'Atlas', gender: 'Nam', expression: 'Kiên định' },
  { id: 'Rhea', name: 'Rhea', gender: 'Nữ', expression: 'Hiền hậu' },
  { id: 'Selene', name: 'Selene', gender: 'Nữ', expression: 'Kiêu sa' },
  { id: 'Helios', name: 'Helios', gender: 'Nam', expression: 'Hùng tráng' },
  { id: 'Eos', name: 'Eos', gender: 'Nữ', expression: 'Khởi đầu' },
  { id: 'Nike', name: 'Nike', gender: 'Nữ', expression: 'Chiến thắng' },
  { id: 'Pallas', name: 'Pallas', gender: 'Nữ', expression: 'Trí tuệ' },
  { id: 'Metis', name: 'Metis', gender: 'Nữ', expression: 'Khéo léo' },
  { id: 'Themis', name: 'Themis', gender: 'Nữ', expression: 'Công bằng' },
  { id: 'Leto', name: 'Leto', gender: 'Nữ', expression: 'Bao dung' },
  { id: 'Maia', name: 'Maia', gender: 'Nữ', expression: 'Mộc mạc' },
  { id: 'Leda', name: 'Leda', gender: 'Nữ', expression: 'Duyên dáng' },
  { id: 'Doris', name: 'Doris', gender: 'Nữ', expression: 'Biển cả' }
];

const ACCENTS = ['Tự nhiên', 'Miền Bắc', 'Miền Nam', 'Miền Trung (Hue)'];

export default function App() {
  const [storyInput, setStoryInput] = useState("");
  const [visualStyle, setVisualStyle] = useState("Pixar 3D");
  const [globalContext, setGlobalContext] = useState("Vietnam in 3rd Century BC");
  
  // Iterative Generation State
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isGeneratingScene, setIsGeneratingScene] = useState(false);
  const [storyPlan, setStoryPlan] = useState<StoryPlan | null>(null);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(-1); // -1: no plan, 0+: scene index
  const [viewingSceneIndex, setViewingSceneIndex] = useState(0);
  const [generatedScenes, setGeneratedScenes] = useState<Scene[]>([]);
  const [isAutoGenerate, setIsAutoGenerate] = useState(false);
  
  const VISUAL_STYLE_OPTIONS = [
    "Cinematic",
    "Realistic",
    "Anime",
    "Fantasy",
    "Historial",
    "Cinematic 3D animation",
    "Pixar 3D",
    "Studio Ghibli Anime",
    "Cyberpunk Neon",
    "Classic Black & White Noir",
    "Hand-drawn Sketch",
    "Realistic Oil Painting",
    "Lego Animation"
  ];
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>(localStorage.getItem("GEMINI_API_KEY") || "");
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(apiKey);
  const [isMusicEnabled, setIsMusicEnabled] = useState(false);
  const [charVoices, setCharVoices] = useState<Record<string, { voiceId: string, accent: string }>>({});

  const handleVoiceSetting = (charName: string, voiceId: string, accent: string) => {
    setCharVoices(prev => ({
      ...prev,
      [charName]: { voiceId, accent }
    }));
  };

  useEffect(() => {
    if (apiKey) {
      localStorage.setItem("GEMINI_API_KEY", apiKey);
    }
  }, [apiKey]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!storyInput.trim() || isGeneratingPlan) return;

    setIsGeneratingPlan(true);
    setError(null);
    setStoryPlan(null);
    setGeneratedScenes([]);
    setCurrentSceneIndex(-1);

    try {
      const plan = await generateStoryPlan(storyInput, apiKey, visualStyle, globalContext);
      setStoryPlan(plan);
      setCurrentSceneIndex(0); // Move to first scene generation
      setViewingSceneIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleGenerateNextScene = async () => {
    if (!storyPlan || isGeneratingScene) return;
    if (currentSceneIndex >= storyPlan.sceneOutline.length) return;

    setIsGeneratingScene(true);
    setError(null);

    try {
      const sceneOutline = storyPlan.sceneOutline[currentSceneIndex];
      const newScene = await generateIndividualScene(
        currentSceneIndex,
        sceneOutline,
        storyPlan,
        apiKey,
        visualStyle,
        globalContext
      );
      setGeneratedScenes(prev => [...prev, newScene]);
      setViewingSceneIndex(currentSceneIndex);
      setCurrentSceneIndex(prev => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate scene");
    } finally {
      setIsGeneratingScene(false);
    }
  };

  useEffect(() => {
    if (isAutoGenerate && storyPlan && generatedScenes.length < storyPlan.sceneOutline.length && !isGeneratingScene) {
      const timer = setTimeout(() => {
        handleGenerateNextScene();
      }, 1000); // Small delay between scenes
      return () => clearTimeout(timer);
    }
  }, [isAutoGenerate, generatedScenes.length, isGeneratingScene, storyPlan]);

  const copyToClipboard = (text: string, index: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleUpdateScene = (index: number, updatedScene: Scene) => {
    const newScenes = [...generatedScenes];
    newScenes[index] = updatedScene;
    setGeneratedScenes(newScenes);
  };

  const handleUpdateCharacter = (index: number, updatedProfile: string) => {
    if (!storyPlan) return;
    const newChars = [...storyPlan.characters];
    newChars[index] = { ...newChars[index], profile: updatedProfile };
    setStoryPlan({ ...storyPlan, characters: newChars });
  };
  const getProjectName = () => {
    if (!storyInput) return "storyboard";
    const quotesMatch = storyInput.match(/"([^"]+)"/);
    if (quotesMatch && quotesMatch[1]) {
      return quotesMatch[1].trim();
    }
    return storyPlan?.summary ? storyPlan.summary.slice(0, 30).trim() : "storyboard";
  };

  const downloadJson = () => {
    if (!storyPlan || generatedScenes.length === 0) return;
    const data = {
      summary: storyPlan.summary,
      characters: storyPlan.characters,
      scenes: generatedScenes
    };
    const projectName = getProjectName();
    const cleanFileName = projectName.replace(/[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ\s]/gi, '').replace(/\s+/g, '_').toLowerCase();
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${cleanFileName}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportProject = () => {
    if (!storyPlan || generatedScenes.length === 0) return;

    const projectName = getProjectName();
    const cleanFileName = projectName.replace(/[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ\s]/gi, '').replace(/\s+/g, '_').toLowerCase();

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>Storyboard Production Report</title>
        <style>
          body { font-family: 'Verdana', sans-serif; line-height: 1.4; color: #333; padding: 20px; font-size: 8pt; }
          h1 { font-size: 14pt; color: #d9480f; border-bottom: 2px solid #d9480f; padding-bottom: 5px; text-transform: uppercase; font-weight: bold; }
          h2 { font-size: 11pt; color: #1098ad; border-bottom: 1px solid #1098ad; margin-top: 25px; text-transform: uppercase; font-weight: bold; }
          h3 { font-size: 9pt; color: #f08c00; background: #fff4e6; padding: 5px 10px; border-radius: 4px; margin-top: 20px; font-weight: bold; }
          .section { margin-bottom: 25px; padding: 15px; border: 1px solid #eee; border-radius: 4px; background: #fff; }
          .character-card { background: #f8f9fa; padding: 12px; margin-bottom: 12px; border-left: 4px solid #f08c00; }
          .shot-card { background: #f1f3f5; padding: 15px; margin-bottom: 20px; border-left: 4px solid #1098ad; border-right: 1px solid #dee2e6; border-top: 1px solid #dee2e6; border-bottom: 1px solid #dee2e6; }
          .label { font-weight: bold; color: #495057; text-transform: uppercase; font-size: 7pt; margin-bottom: 2px; display: block; }
          .value { display: block; margin-bottom: 8px; font-size: 8pt; color: #212529; }
          .dialogue-box { background: #e7f5ff; padding: 10px; border-radius: 4px; font-style: italic; border-left: 3px solid #339af0; margin: 5px 0; font-size: 8pt; }
          .prompt-box { background: #ffffff; border: 1px dashed #ced4da; padding: 10px; font-family: 'Courier New', Courier, monospace; font-size: 7pt; color: #495057; line-height: 1.3; margin-top: 5px; }
          .grid-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          .grid-td { padding: 8px; border: 1px solid #dee2e6; }
        </style>
      </head>
      <body>
        <h1>STORYBOARD PRODUCTION REPORT</h1>
        <div class="section">
          <p class="label">Project Title / Concept Idea:</p>
          <p class="value" style="font-size: 10pt; font-weight: bold;">${projectName}</p>
          <p class="label">Sequence Summary:</p>
          <p class="value">${storyPlan.summary}</p>
        </div>

        <h2>CAST REGISTRY & CHARACTER PROFILES</h2>
        ${storyPlan.characters.map((char, i) => `
          <div class="character-card">
            <p class="value">${char.profile}</p>
            <p class="label">Prompt tạo nhân vật:</p>
            <div class="prompt-box">${char.prompt}</div>
            <p class="label">Cấu hình giọng nói:</p>
            <p class="value">${char.voice || "Chưa thiết lập"}</p>
          </div>
        `).join('')}

        <br clear="all" style="page-break-before:always" />

        ${generatedScenes.map((scene, i) => `
          <h2>CẢNH ${scene.sceneNumber}: ${scene.title.toUpperCase()}</h2>
          <div class="section">
            <p class="label">Summary cảnh:</p>
            <p class="value">${scene.summary}</p>
            <p class="label">Bối cảnh:</p>
            <p class="value">${scene.environment}</p>
            <p class="label">Nhân vật xuất hiện:</p>
            <p class="value">${scene.charactersInScene.map(c => `${c.name} — ${c.role}`).join(', ')}</p>
            <p class="label">Diễn biến chính:</p>
            <p class="value">${scene.mainAction}</p>
          </div>

          ${scene.shots.map((shot, j) => `
            <div class="shot-card">
              <h3 style="margin-top:0;">${shot.name}</h3>
              <table class="grid-table">
                <tr>
                  <td class="grid-td" width="50%"><p class="label">Góc quay</p><p class="value">${shot.angle}</p></td>
                  <td class="grid-td" width="50%"><p class="label">Gợi ý góc máy</p><p class="value">${shot.camera}</p></td>
                </tr>
                <tr>
                  <td class="grid-td"><p class="label">Hành động</p><p class="value">${shot.action}</p></td>
                  <td class="grid-td"><p class="label">Cảm xúc</p><p class="value">${shot.emotion}</p></td>
                </tr>
              </table>
              <p class="label">Mô tả hình ảnh:</p>
              <p class="value">${shot.description}</p>
              
              <p class="label">Lời thoại tiếng Việt:</p>
              <div class="dialogue-box">${shot.dialogue_VN || "Không có thoại"}</div>
              
              <p class="label">Lời thoại tiếng Anh:</p>
              <div class="dialogue-box" style="background: #f8f9fa;">${shot.dialogue_EN || "No dialogue"}</div>

              <p class="label">Prompt copy:</p>
              <div class="prompt-box">${shot.prompt}</div>
            </div>
          `).join('')}
          <br clear="all" style="page-break-before:always" />
        `).join('')}

        <div style="text-align: center; margin-top: 30px; font-size: 7pt; color: #adb5bd;">
          STORYBOARD PRO ENGINE • VEO 3 OPTIMIZED • ${new Date().toLocaleString()}
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], {
      type: 'application/msword'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${cleanFileName}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#303030] text-neutral-200 font-sans selection:bg-orange-500/30 flex flex-col">
      {/* Background Grid Accent */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-neutral-800 bg-[#101010]/40 backdrop-blur-md p-[15px]">
        <div className="w-full px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 hover-group-header group cursor-pointer">
            <div className="p-2 bg-orange-600 rounded-lg shadow-lg shadow-orange-600/20 animate-flow-glow">
              <Clapperboard className="w-5 h-5 text-white" />
            </div>
            <div className="header-shimmer-container">
              <div className="header-shimmer-effect" />
              <div className="relative z-10">
                <h1 className="text-[28px] font-black tracking-tight uppercase cursor-default select-none flex items-center">
                  <span className="text-[#4499ff]">STORYBOARD</span>
                  <span className="text-[#FF8833] ml-2">PRO</span>
                </h1>
                <p className="text-[15px] text-neutral-400 font-mono tracking-widest leading-none cursor-help">VEO 3 ENGINE READY</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMusicEnabled(!isMusicEnabled)}
              className={`p-2 rounded-lg transition-all border ${isMusicEnabled ? 'bg-purple-600/20 border-purple-500/50 text-purple-400' : 'bg-neutral-800 border-neutral-700 text-neutral-500'}`}
              title="Toggle Background Music"
            >
              <Sparkles className={`w-4 h-4 ${isMusicEnabled ? 'animate-pulse' : ''}`} />
            </button>
            <button
              onClick={() => setIsApiKeyModalOpen(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
                apiKey 
                ? "bg-green-600/20 text-green-400 border-green-500/30 hover:bg-green-600/30" 
                : "animate-blinking-red text-white border-red-400/50 hover:opacity-90 animate-flow-glow"
              }`}
            >
              <Key className="w-4 h-4" />
              {apiKey ? "API KEY ACTIVE" : "SET API KEY"}
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-black/40 border border-neutral-800 rounded-full text-xs font-mono text-neutral-400">
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${apiKey ? 'bg-green-500' : 'bg-red-500'}`} />
              {apiKey ? 'SYSTEM READY' : 'WAITING FOR KEY'}
            </div>
          </div>
        </div>
      </header>

      {isMusicEnabled && (
        <audio autoPlay loop src="https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3" />
      )}

      <main className="flex-1 w-full flex flex-col relative py-8 px-6">
        <div className="flex flex-col lg:flex-row gap-8 w-full h-full flex-1">
          
          {/* Left Column: Input */}
          <div className="w-full lg:w-[35%] flex flex-col gap-6">
            <section className="bg-[#101010] border border-neutral-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 mb-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                      <Sparkles className="w-3 h-3 text-purple-400" /> Visual Style
                    </label>
                    <select
                      value={visualStyle}
                      onChange={(e) => setVisualStyle(e.target.value)}
                      className="w-full bg-black/40 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-neutral-300 focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none transition-all appearance-none cursor-pointer"
                    >
                      {VISUAL_STYLE_OPTIONS.map(opt => (
                        <option key={opt} value={opt} className="bg-[#101010]">{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                      <Camera className="w-3 h-3 text-purple-400" /> Global Context (Time & Space)
                    </label>
                    <input
                      type="text"
                      value={globalContext}
                      onChange={(e) => setGlobalContext(e.target.value)}
                      placeholder="e.g., Vietnam in 1990s, Neo-Tokyo 2077..."
                      className="w-full bg-black/40 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-neutral-300 focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none transition-all placeholder:text-neutral-700"
                    />
                  </div>
                </div>

                <div className="relative">
                  <div className="flex items-center gap-2 mb-2 text-neutral-400">
                    <Sparkles className="w-4 h-4 text-orange-500" />
                    <h2 className="text-xs font-semibold uppercase tracking-wider">Concept Idea</h2>
                  </div>
                  <textarea
                    value={storyInput}
                    onChange={(e) => setStoryInput(e.target.value)}
                    placeholder="Describe your story idea here... (e.g., A dystopian city where rain brings music to life)"
                    className="w-full h-64 bg-black/40 border border-neutral-800 rounded-xl p-4 text-sm text-neutral-300 focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500 outline-none transition-all resize-none placeholder:text-neutral-700 shadow-inner"
                  />
                  <div className="absolute bottom-3 right-3 text-[10px] font-mono text-neutral-600">
                    {storyInput.length} chars
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isGeneratingPlan || isGeneratingScene || !storyInput.trim() || !apiKey}
                  className="w-full py-4 bg-[#a04400] hover:bg-[#c15500] text-white border border-orange-500/50 hover:border-orange-400 shadow-[0_0_20px_rgba(160,68,0,0.4)] hover:shadow-[0_0_40px_#ff9933] disabled:bg-neutral-800 disabled:text-neutral-600 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 duration-300 group animate-btn-light-sweep"
                >
                  {isGeneratingPlan ? (
                    <RefreshCcw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {apiKey ? (storyPlan ? 'START OVER' : 'GENERATE INITIAL PLAN') : 'KEY REQUIRED'}
                      {apiKey && <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                    </>
                  )}
                </button>
                <div className="flex flex-col items-center gap-1 mt-2 text-[10px] font-mono text-neutral-500 font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1 h-1 bg-neutral-700 rounded-full" />
                    ESTIMATED COST: <span className="text-orange-500/80">~$0.0002 USD</span> / <span className="text-orange-500/80">~5.08 VND</span> PER RUN
                  </div>
                  <p className="text-[8px] opacity-60 uppercase tracking-tighter">Based on Gemini 3 Flash standard pricing</p>
                </div>
              </form>
              {error && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
                  {error}
                </div>
              )}
            </section>

            {storyPlan && storyPlan.characters && (
              <section className="bg-[#101010] border border-neutral-800 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-neutral-400">
                    <User className="w-4 h-4" />
                    <h2 className="text-xs font-semibold uppercase tracking-wider">Cast Registry</h2>
                  </div>
                </div>
                <div className="space-y-3">
                  {storyPlan.characters.map((char, i) => (
                    <CharacterItem 
                      key={i} 
                      char={char} 
                      voiceSetting={charVoices[char.name] || { voiceId: 'Puck', accent: 'Tự nhiên' }}
                      onVoiceChange={(v, a) => handleVoiceSetting(char.name, v, a)}
                      apiKey={apiKey}
                      onUpdate={(profile) => handleUpdateCharacter(i, profile)}
                      onVoiceMetadataUpdate={() => {}} // Legacy
                      onReset={() => {}} // Legacy
                      onCopyPrompt={(p) => copyToClipboard(p, `char-${i}`)}
                      isCopied={copiedIndex === `char-${i}`}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right Column: Results */}
          <div className="w-full lg:w-[65%] flex flex-col h-full gap-6">
            {!storyPlan && !isGeneratingPlan && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-neutral-800 rounded-3xl opacity-50 bg-[#101010]/30 min-h-[500px]">
                <Film className="w-16 h-16 text-neutral-700 mb-6" />
                <h3 className="text-xl font-semibold mb-2">Initialize Your Project</h3>
                <p className="text-sm text-neutral-500 max-w-sm">Create an initial summary and character profiles to begin your iterative storyboard generation.</p>
              </div>
            )}

            {isGeneratingPlan && (
              <div className="flex-1 flex flex-col items-center justify-center p-12 bg-[#101010] border border-neutral-800 rounded-3xl animate-pulse min-h-[500px]">
                <Sparkles className="w-12 h-12 text-orange-500/50 mb-4 animate-bounce" />
                <p className="font-mono text-xs text-neutral-500 uppercase tracking-widest text-center">TẠO SCRIPT SUMMARY & HỒ SƠ NHÂN VẬT...</p>
              </div>
            )}

            {storyPlan && (
              <div className="space-y-6 flex-1 flex flex-col overflow-visible">
                <div className="bg-[#101010] p-6 border border-neutral-800 rounded-2xl shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4">
                    <div className="flex gap-2">
                       {currentSceneIndex >= (storyPlan?.sceneOutline?.length || 0) && (
                         <>
                           <button 
                            onClick={handleExportProject}
                            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg text-xs font-bold transition-all text-white border border-orange-400/30 shadow-lg shadow-orange-600/20"
                          >
                            <Download className="w-4 h-4" />
                            STORYBOARD REPORT
                          </button>
                          <button 
                            onClick={downloadJson}
                            className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-xs font-bold transition-all text-neutral-400 border border-neutral-700"
                          >
                            <Download className="w-4 h-4" />
                            JSON
                          </button>
                        </>
                       )}
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2 uppercase tracking-tight">
                      <Film className="w-5 h-5 text-orange-500" />
                      SCRIPT SUMMARY
                    </h2>
                    {storyPlan.title && (
                      <h3 className="text-lg font-bold text-orange-400 mt-2 uppercase tracking-wide">
                        {storyPlan.title}
                      </h3>
                    )}
                    <p className="text-sm text-neutral-400 mt-2 leading-relaxed max-w-none text-justify italic">{storyPlan.summary}</p>
                    
                    <div className="mt-4 pt-4 border-t border-neutral-800/50">
                      <h3 className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span>Scene Outline & Navigation:</span>
                          <button 
                            onClick={() => setIsAutoGenerate(!isAutoGenerate)}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all ${isAutoGenerate ? 'bg-green-600 border-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.5)]' : 'bg-neutral-800 border-green-500/30 text-neutral-500 hover:text-neutral-400 hover:border-green-500 hover:shadow-[0_0_10px_rgba(34,197,94,0.3)]'}`}
                          >
                            <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all ${isAutoGenerate ? 'bg-white border-white' : 'border-neutral-600'}`}>
                              {isAutoGenerate && <Check className="w-2.5 h-2.5 text-green-600" />}
                            </div>
                            <span className="text-[9px] font-bold">AUTO-GENERATE SCENES</span>
                          </button>
                        </div>
                        <span className="text-orange-500/50 leading-none">{generatedScenes.length} / {storyPlan.sceneOutline.length} GENERATED</span>
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {storyPlan.sceneOutline.map((s, idx) => {
                          const isGenerated = idx < generatedScenes.length;
                          const isCurrentProcessing = idx === generatedScenes.length && currentSceneIndex === idx;
                          const isSelected = viewingSceneIndex === idx;
                          
                          return (
                            <button 
                              key={idx} 
                              onClick={() => isGenerated && setViewingSceneIndex(idx)}
                              disabled={!isGenerated}
                              className={`px-3 py-1 rounded text-[10px] font-bold border transition-all flex items-center gap-2 ${
                                isSelected 
                                  ? 'bg-orange-500 border-orange-400 text-white shadow-lg shadow-orange-600/20' 
                                  : isGenerated 
                                    ? 'bg-green-600/10 border-green-500/30 text-green-500 hover:bg-green-600/20' 
                                    : isCurrentProcessing 
                                      ? 'bg-neutral-800 border-orange-500/30 text-orange-500/50 animate-pulse' 
                                      : 'bg-neutral-800/50 border-neutral-800 text-neutral-700'
                              }`}
                            >
                              {isGenerated && <Check className="w-2.5 h-2.5" />}
                              SCENE {idx + 1}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-8 flex-1">
                  {generatedScenes[viewingSceneIndex] && (
                    <SceneCard 
                      scene={generatedScenes[viewingSceneIndex]} 
                      index={viewingSceneIndex} 
                      onCopy={(txt) => copyToClipboard(txt, `scene-${viewingSceneIndex}`)}
                      isCopied={(id) => copiedIndex === id}
                      onUpdate={(updated) => handleUpdateScene(viewingSceneIndex, updated)}
                    />
                  )}

                  {currentSceneIndex === generatedScenes.length && currentSceneIndex < storyPlan.sceneOutline.length && (!generatedScenes[viewingSceneIndex] || viewingSceneIndex === generatedScenes.length - 1) && (
                    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-neutral-800 rounded-3xl bg-black/20">
                      <button
                        onClick={handleGenerateNextScene}
                        disabled={isGeneratingScene}
                        className="px-8 py-4 bg-[#240046] text-white hover:bg-[#2d0057] border border-purple-500/50 hover:border-purple-400 hover:shadow-[0_0_20px_rgba(168,85,247,0.5)] disabled:bg-neutral-800 disabled:text-neutral-600 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 animate-btn-light-sweep"
                      >
                         {isGeneratingScene ? (
                           <>
                             <RefreshCcw className="w-5 h-5 animate-spin text-orange-600" />
                             GENERATING SCENE {currentSceneIndex + 1}...
                           </>
                         ) : (
                           <>
                             <ChevronRight className="w-5 h-5" />
                             GENERATE SCENE {currentSceneIndex + 1}
                           </>
                         )}
                      </button>
                      <p className="text-[10px] text-neutral-600 mt-4 font-mono uppercase tracking-widest">
                        {storyPlan.sceneOutline[currentSceneIndex].title}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* API Key Modal */}
      <AnimatePresence>
        {isApiKeyModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsApiKeyModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-[#101010] border border-neutral-800 rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-600/20 rounded-lg">
                    <Key className="w-5 h-5 text-orange-500" />
                  </div>
                  <h2 className="text-lg font-bold text-white">Gemini API Configuration</h2>
                </div>
                <button 
                  onClick={() => setIsApiKeyModalOpen(false)}
                  className="p-1 hover:bg-neutral-800 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-neutral-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-neutral-500 uppercase tracking-widest mb-1.5">Enter API Key</label>
                  <input
                    type="password"
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    placeholder="Enter your Gemini API key..."
                    className="w-full bg-black/40 border border-neutral-800 rounded-xl p-4 text-sm text-neutral-300 focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500 outline-none transition-all"
                  />
                </div>
                
                <div className="p-4 bg-orange-500/5 border border-orange-500/10 rounded-xl text-[10px] text-neutral-500 leading-relaxed">
                  <p>Your API key is stored locally in your browser. It is required to communicate with Google's Gemini models for storyboard generation.</p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setIsApiKeyModalOpen(false)}
                    className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 rounded-xl text-xs font-bold transition-colors"
                  >
                    CANCEL
                  </button>
                  <button 
                    onClick={() => {
                      setApiKey(tempApiKey);
                      setIsApiKeyModalOpen(false);
                    }}
                    className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 rounded-xl text-xs font-bold transition-all shadow-lg shadow-orange-600/20"
                  >
                    SAVE CONFIG
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer Info */}
      <footer className="border-t border-neutral-800 py-8 px-6 bg-[#101010]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-transparent bg-clip-text gradient-orange animate-text-gradient">
            COPYRIGHT BY NGUYEN QUANG PHUONG ® | VEO 3 OPTIMIZED
          </div>
          <div className="flex gap-6 text-[10px] font-mono text-neutral-600 uppercase tracking-widest transition-all">
            <span className="flex items-center gap-1 hover:text-neutral-400 cursor-help transition-colors"><Settings className="w-3 h-3" /> PIPELINE_CONFIG</span>
            <span className="flex items-center gap-1 hover:text-neutral-400 cursor-help transition-colors"><User className="w-3 h-3" /> USER_AUTH_ACTIVE</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

interface CharacterItemProps {
  char: Character;
  voiceSetting: { voiceId: string; accent: string };
  onVoiceChange: (voiceId: string, accent: string) => void;
  apiKey: string;
  onUpdate: (profile: string) => void;
  onVoiceMetadataUpdate: (voice: string) => void;
  onReset: () => void;
  onCopyPrompt: (prompt: string) => void;
  isCopied: boolean;
  key?: any;
}

function CharacterItem({ char, voiceSetting, onVoiceChange, apiKey, onUpdate, onVoiceMetadataUpdate, onReset, onCopyPrompt, isCopied }: CharacterItemProps) {
  const [profile, setProfile] = useState(char.profile);
  const [showVoicePopup, setShowVoicePopup] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    setProfile(char.profile);
  }, [char.profile]);

  const isChanged = profile !== char.profile;
  
  // Try to detect gender from profile to auto-filter voices
  const detectedGender = (char.profile.toLowerCase().includes("nữ") || char.profile.toLowerCase().includes("female") || char.profile.toLowerCase().includes("girl") || char.profile.toLowerCase().includes("woman")) ? "Nữ" : 
                       (char.profile.toLowerCase().includes("nam") || char.profile.toLowerCase().includes("male") || char.profile.toLowerCase().includes("boy") || char.profile.toLowerCase().includes("man")) ? "Nam" : null;

  const filteredVoices = detectedGender ? GEMINI_VOICES.filter(v => v.gender === detectedGender) : GEMINI_VOICES;

  const handleGenerateVoice = async () => {
    if (!apiKey) return;
    setIsGeneratingAudio(true);
    try {
      const selectedVoice = GEMINI_VOICES.find(v => v.id === voiceSetting.voiceId);
      const textToRead = `Đây là giọng nói ${selectedVoice?.name}, ${selectedVoice?.gender}, ${selectedVoice?.expression} đọc theo âm hưởng ${voiceSetting.accent}.`;
      
      const { data, mimeType } = await generateTTS(textToRead, voiceSetting.voiceId, voiceSetting.accent, apiKey);
      
      // Clean up previous URL if it exists
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }

      const blob = await fetch(`data:${mimeType};base64,${data}`).then(res => res.blob());
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      
      const audio = new Audio(url);
      audio.oncanplaythrough = () => {
        audio.play().catch(e => console.error("Audio playback failed:", e));
      };
    } catch (err) {
      console.error(err);
      alert("Lỗi tạo giọng nói. Vui lòng thử lại.");
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleApplyVoice = () => {
    const selectedVoice = GEMINI_VOICES.find(v => v.id === voiceSetting.voiceId);
    if (selectedVoice) {
      const voiceStr = `${selectedVoice.name}, ${selectedVoice.gender}, ${selectedVoice.expression}, ${voiceSetting.accent}`;
      onVoiceMetadataUpdate(voiceStr);
      setShowVoicePopup(false);
    }
  };

  return (
    <div className="group p-3 bg-black/40 border border-neutral-800 rounded-lg hover:border-neutral-700 transition-colors relative">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold text-orange-400">PROFILE</h3>
          
          <button 
            onClick={() => onCopyPrompt(char.prompt)}
            className={`p-1 rounded-md transition-colors ${isCopied ? 'bg-green-600/30 text-green-400' : 'bg-neutral-800 text-neutral-500 hover:text-neutral-300'}`}
            title="Sử dụng Copy Prompt Nhân Vật"
          >
            {isCopied ? <Check className="w-3 h-3" /> : <Camera className="w-3 h-3" />}
          </button>

          <button 
            onClick={() => setShowVoicePopup(!showVoicePopup)}
            className={`p-1 rounded-md transition-colors ${showVoicePopup ? 'bg-purple-600/30 text-purple-400' : 'bg-neutral-800 text-neutral-500 hover:text-neutral-300'}`}
            title="Thiết lập giọng nói"
          >
            <Mic className="w-3 h-3" />
          </button>
          
          <button 
            onClick={handleGenerateVoice}
            disabled={isGeneratingAudio || !apiKey}
            className={`p-1 rounded-md transition-colors ${isGeneratingAudio ? 'bg-orange-600/30 text-orange-400' : 'bg-neutral-800 text-neutral-500 hover:text-neutral-300'}`}
            title="Thử giọng nói"
          >
            {isGeneratingAudio ? <Loader2 className="w-3 h-3 animate-spin" /> : <Volume2 className="w-3 h-3" />}
          </button>
        </div>

        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {isChanged && (
            <button 
              onClick={() => onUpdate(profile)}
              className="text-[10px] font-mono text-green-500 hover:text-green-400"
            >
              UPDATE
            </button>
          )}
          <button 
            onClick={() => {
              onReset();
              setProfile(char.profile);
            }}
            className="text-[10px] font-mono text-neutral-600 hover:text-neutral-400"
          >
            RESET
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showVoicePopup && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className="absolute left-0 top-10 z-[60] w-64 bg-[#151515] border border-neutral-800 rounded-xl p-4 shadow-2xl overflow-visible"
          >
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-800">
              <span className="text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <Mic className="w-3 h-3 text-purple-500" /> Voice Config
              </span>
              <button onClick={() => setShowVoicePopup(false)}>
                <X className="w-3 h-3 text-neutral-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[8px] font-mono text-neutral-500 uppercase mb-1">Giọng nói (Gemini 3.1 TTS) {detectedGender && `[${detectedGender.toUpperCase()}]`}</label>
                <div className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                  {(filteredVoices.length > 0 ? filteredVoices : GEMINI_VOICES).map((v) => (
                    <button
                      key={v.id}
                      onClick={() => onVoiceChange(v.id, voiceSetting.accent)}
                      className={`flex items-center justify-between p-2 rounded-md transition-all text-left ${voiceSetting.voiceId === v.id ? 'bg-purple-600 text-white' : 'bg-black/40 text-neutral-400 hover:bg-neutral-800'}`}
                    >
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold">{v.name}</span>
                        <span className="text-[8px] opacity-70">{v.gender} • {v.expression}</span>
                      </div>
                      {voiceSetting.voiceId === v.id && <Check className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[8px] font-mono text-neutral-500 uppercase mb-1">Vùng miền (Accent)</label>
                <div className="flex flex-wrap gap-1">
                  {ACCENTS.map((acc) => (
                    <button
                      key={acc}
                      onClick={() => onVoiceChange(voiceSetting.voiceId, acc)}
                      className={`px-2 py-1 rounded text-[9px] font-bold transition-all border ${voiceSetting.accent === acc ? 'bg-orange-600 border-orange-500 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-500 hover:text-neutral-300'}`}
                    >
                      {acc}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleApplyVoice}
                className="w-full py-2 mt-2 bg-green-600 hover:bg-green-500 text-white text-[10px] font-bold rounded-lg transition-colors shadow-lg shadow-green-600/20"
              >
                UPDATE VOICE
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <textarea
        value={profile}
        onChange={(e) => setProfile(e.target.value)}
        className="w-full bg-transparent text-[10px] text-neutral-400 leading-relaxed outline-none resize-none focus:text-neutral-200 transition-colors min-h-[80px] custom-scrollbar"
      />
      
      <div className="mt-2 pt-2 border-t border-neutral-800">
        <span className="text-[9px] font-mono text-orange-500/70 uppercase mb-1 block">Prompt tạo nhân vật</span>
        <div 
          onClick={() => onCopyPrompt(char.prompt)}
          className="bg-black/60 p-2 rounded-lg border border-orange-500/10 font-mono text-[9px] text-orange-400/80 leading-tight group-hover:border-orange-500/30 transition-all cursor-pointer hover:bg-orange-500/5"
        >
          {char.prompt}
        </div>
      </div>
    </div>
  );
}

interface SceneCardProps {
  scene: Scene;
  index: number;
  onCopy: (txt: string) => void;
  isCopied: (id: string) => boolean;
  onUpdate: (updated: Scene) => void;
  key?: any;
}

function SceneCard({ scene, index, onCopy, isCopied, onUpdate }: SceneCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editedScene, setEditedScene] = useState<Scene>(JSON.parse(JSON.stringify(scene)));

  useEffect(() => {
    setEditedScene(JSON.parse(JSON.stringify(scene)));
  }, [scene]);

  const handleShotChange = (shotIdx: number, field: string, value: string) => {
    const newShots = [...editedScene.shots];
    (newShots[shotIdx] as any)[field] = value;
    setEditedScene({ ...editedScene, shots: newShots });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl"
    >
      <div className="p-6 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 flex flex-col items-center justify-center bg-orange-600 rounded-2xl text-white shadow-lg shadow-orange-600/20">
            <span className="text-[10px] font-bold uppercase tracking-tighter opacity-70">Scene</span>
            <span className="text-xl font-black leading-none">{scene.sceneNumber}</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight uppercase">{scene.title}</h3>
            <p className="text-xs text-neutral-500 font-medium italic mt-0.5">{scene.summary}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="p-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-xl transition-all"
          >
            {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6 border-b border-neutral-800/50">
           <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Environment</span>
                <p className="text-sm text-neutral-300 leading-relaxed bg-black/20 p-3 rounded-xl border border-neutral-800/50">{scene.environment}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Characters In Scene</span>
                <div className="flex flex-wrap gap-2">
                  {scene.charactersInScene.map((c, i) => (
                    <div key={i} className="px-3 py-1 bg-neutral-800/50 border border-neutral-700 rounded-lg text-xs">
                      <span className="font-bold text-orange-400">{c.name}</span> — {c.role}
                    </div>
                  ))}
                </div>
              </div>
           </div>
           <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Actions & Plot</span>
                <p className="text-sm text-neutral-300 leading-relaxed bg-black/20 p-3 rounded-xl border border-neutral-800/50">{scene.mainAction}</p>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {editedScene.shots.map((shot, sIdx) => (
            <div key={sIdx} className="bg-black/40 border border-neutral-800 rounded-2xl overflow-hidden group hover:border-neutral-700 transition-all">
              <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-800/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center bg-orange-600/10 border border-orange-500/30 rounded-xl text-orange-500 font-black text-sm">
                    {sIdx + 1}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">{shot.name}</h4>
                    <p className="text-[10px] text-neutral-500 font-mono italic">{shot.angle}</p>
                  </div>
                </div>
                <button 
                  onClick={() => onCopy(shot.prompt)}
                  className={`p-2 rounded-lg transition-all ${isCopied(`shot-${index}-${sIdx}`) ? 'bg-green-600/20 text-green-500' : 'bg-neutral-800 text-neutral-500 hover:text-white'}`}
                >
                  {isCopied(`shot-${index}-${sIdx}`) ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-neutral-500 uppercase">Camera</span>
                    <input 
                      value={shot.camera} 
                      onChange={(e) => handleShotChange(sIdx, 'camera', e.target.value)}
                      className="w-full bg-transparent text-[11px] text-neutral-300 font-medium outline-none focus:text-orange-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-neutral-500 uppercase">Emotion</span>
                    <input 
                      value={shot.emotion} 
                      onChange={(e) => handleShotChange(sIdx, 'emotion', e.target.value)}
                      className="w-full bg-transparent text-[11px] text-neutral-300 font-medium outline-none focus:text-orange-400"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-neutral-500 uppercase">Image Description</span>
                  <textarea 
                    value={shot.description} 
                    onChange={(e) => handleShotChange(sIdx, 'description', e.target.value)}
                    className="w-full bg-transparent text-[11px] text-neutral-400 leading-relaxed outline-none resize-none h-12 custom-scrollbar focus:text-neutral-200"
                  />
                </div>

                <div className="space-y-3 pt-3 border-t border-neutral-800">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-blue-400 uppercase">Dialogue (VN)</span>
                    <input 
                      value={shot.dialogue_VN} 
                      onChange={(e) => handleShotChange(sIdx, 'dialogue_VN', e.target.value)}
                      className="w-full bg-transparent text-[11px] text-blue-200/70 font-medium outline-none focus:text-blue-300"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-neutral-500 uppercase">Dialogue (EN)</span>
                    <input 
                      value={shot.dialogue_EN} 
                      onChange={(e) => handleShotChange(sIdx, 'dialogue_EN', e.target.value)}
                      className="w-full bg-transparent text-[11px] text-neutral-500 italic font-medium outline-none focus:text-neutral-300"
                    />
                  </div>
                </div>

                <div className="pt-2">
                   <span className="text-[9px] font-mono text-orange-500/70 uppercase mb-1 block">VEO 3 PROMPT</span>
                   <div className="bg-black/60 p-3 rounded-xl border border-orange-500/10 font-mono text-[9px] text-orange-500/80 leading-relaxed group-hover:border-orange-500/30 transition-all">
                     {shot.prompt}
                   </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden border-t border-neutral-800"
          >
            <div className="p-6 bg-black/60">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Raw Production JSON</span>
                <span className="text-[10px] font-mono text-neutral-600 italic uppercase tracking-widest">VEO 3 READY</span>
              </div>
              <pre className="text-[10px] font-mono text-neutral-400 leading-relaxed overflow-x-auto p-4 bg-black/40 rounded-xl border border-neutral-800/50 custom-scrollbar">
                {JSON.stringify(editedScene, null, 2)}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface MetaItemProps {
  label: string;
  value: string;
  className?: string;
  type?: 'text' | 'select';
  options?: string[];
  onChange?: (val: string) => void;
}

function MetaItem({ label, value, className = "", type = 'text', options = [], onChange }: MetaItemProps) {
  return (
    <div className={`p-2 bg-neutral-800/30 border border-neutral-800/50 rounded-lg group hover:border-neutral-700 transition-colors ${className}`}>
      <span className="block text-[10px] text-purple-400 uppercase font-mono font-bold tracking-tighter mb-0.5 drop-shadow-[0_0_3px_rgba(168,85,247,0.3)] group-hover:text-purple-300 group-hover:drop-shadow-[0_0_5px_rgba(168,85,247,0.6)] transition-all">
        {label}
      </span>
      {type === 'select' ? (
        <select 
          value={value} 
          onChange={(e) => onChange?.(e.target.value)}
          className="block w-full text-[10.8px] text-neutral-400 font-bold bg-transparent outline-none appearance-none cursor-pointer group-hover:text-orange-400 transition-colors uppercase"
        >
          {options.map(opt => (
            <option key={opt} value={opt} className="bg-neutral-900">{opt}</option>
          ))}
        </select>
      ) : (
        <input
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="block w-full text-[10.8px] text-neutral-400 font-bold bg-transparent outline-none group-hover:text-orange-400 transition-colors uppercase"
        />
      )}
    </div>
  );
}
