"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Footer from "./components/Footer";

export default function Home() {
  const [letter, setLetter] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fontLoaded, setFontLoaded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [meshyTaskId, setMeshyTaskId] = useState<string | null>(null);
  const [refineTaskId, setRefineTaskId] = useState<string | null>(null);
  const [ornamentId, setOrnamentId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const font = new FontFace(
      "Trattatello",
      "url(/font/Trattatello.woff) format('woff')"
    );

    font.load().then((loadedFont) => {
      document.fonts.add(loadedFont);
      setFontLoaded(true);
    });
  }, []);

  // Meshy task polling
  useEffect(() => {
    if (!meshyTaskId || !ornamentId) return;

    // refineTaskId가 있으면 그것을 polling, 없으면 meshyTaskId를 polling
    const currentTaskId = refineTaskId || meshyTaskId;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/meshy/${currentTaskId}?ornamentId=${ornamentId}`);

        if (!response.ok) {
          console.error("Polling failed:", response.status, response.statusText);
          return;
        }

        const data = await response.json();
        console.log("Polling response:", data);

        if (data.success) {
          const currentProgress = data.progress || 0;
          setProgress(currentProgress);
          console.log(`Progress: ${currentProgress}%`);

          // Preview task 완료 후 refine task가 생성되면 refineTaskId 저장
          if (data.refineTaskId && !refineTaskId) {
            console.log("🎨 Refine task ID received:", data.refineTaskId);
            setRefineTaskId(data.refineTaskId);
            setProgress(0); // Progress 리셋
          }

          // Refine task 완료 시에만 완료 페이지로 이동
          if (data.status === "SUCCEEDED" && data.asset3dUrl) {
            // 완료되면 polling 중지하고 complete 페이지로 이동
            clearInterval(pollInterval);
            setIsGenerating(false);
            setTimeout(() => {
              router.push(`/complete?ornamentId=${ornamentId}`);
            }, 500);
          } else if (data.status === "FAILED") {
            clearInterval(pollInterval);
            setIsGenerating(false);
            alert("3D asset generation failed. Please try again.");
          }
        } else {
          console.error("Polling returned error:", data.error);
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 5000); // 5초마다 확인

    return () => clearInterval(pollInterval);
  }, [meshyTaskId, refineTaskId, ornamentId, router]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLetter(e.target.value);
    // 높이 자동 조정
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  };

  const handleSubmit = async () => {
    setIsAnimating(true);

    try {
      const formData = new FormData();
      // ornamentId 추가 (고유 ID 생성)
      const newOrnamentId = `ornament_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setOrnamentId(newOrnamentId);
      formData.append("ornamentId", newOrnamentId);
      formData.append("story", letter);

      if (imagePreview) {
        const response = await fetch(imagePreview);
        const blob = await response.blob();
        formData.append("image", blob, "memory.jpg");
      }

      const result = await fetch("/api/letters", {
        method: "POST",
        body: formData,
      });

      const data = await result.json();
      console.log("Submit response:", data);

      if (data.success) {
        console.log("✅ Submit successful, data:", data.data);
        console.log("🔍 meshyTaskId:", data.data.meshyTaskId);
        console.log("🔍 extractedObject:", data.data.extractedObject);

        setTimeout(() => {
          setIsAnimating(false);

          // Meshy task가 있으면 progress bar 표시
          if (data.data.meshyTaskId) {
            console.log("🚀 Starting 3D generation with task ID:", data.data.meshyTaskId);
            setMeshyTaskId(data.data.meshyTaskId);
            setIsGenerating(true);
            console.log("✅ isGenerating set to true");
            setProgress(0);
          } else {
            console.log("⚠️ No meshyTaskId found, redirecting to complete page");
            // Meshy task가 없으면 바로 완료 페이지로
            router.push(`/complete?ornamentId=${newOrnamentId}`);
          }
        }, 100);
      } else {
        alert(`Failed to save: ${data.error}`);
        setIsAnimating(false);
      }
    } catch (error) {
      console.error("Submit error:", error);
      alert("Failed to save letter");
      setIsAnimating(false);
    }
  };

  return (
    <div className="flex text-[#424242] min-h-screen items-center justify-center bg-[#CFD1C3] overflow-hidden">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center gap-8 py-16 px-8">
        {/* Progress Bar Overlay */}
        {isGenerating && (
          <div className="fixed text-[#CFD1C3] inset-0 bg-[#3A3A3A] flex flex-col items-center justify-center z-50">
            <h2
              className="text-[clamp(4rem,6vw,5rem)] leading-none  mb-2"
              style={{ fontFamily: fontLoaded ? "Trattatello, serif" : "serif" }}
            >
              Santa is coming
            </h2>
            <div className="p-8 max-w-md w-full mx-4">
              <div className="text-center mb-6">
                <div className="flex justify-center text-[40vw] sm:text-[15vw] select-none mb-4"><div className="animate-bounce delay-[0.2s]">🦌</div><div className="animate-bounce" style={{ animationDelay: "0.2s" }}
                >🛷</div></div>

                <p className="text-lg">
                  This may take 5-6 minutes! Turning your memory into a Mornament.
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-4 mb-4 overflow-hidden">
                <div
                  className="bg-[#424242] h-4 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>

              {/* Progress Text */}
              <div className="text-center text-sm">
                {progress}%
              </div>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="text-center">
          <div className="text-[40vw] sm:text-[20vw] select-none">🎄</div>
          <h1
            className="text-[clamp(4rem,6vw,5rem)] leading-none text-[#424242] dark:text-red-400 "
            style={{ fontFamily: fontLoaded ? "Trattatello, serif" : "serif" }}
          >
            The Way We Reminisce
          </h1>
          <p className="my-12 text-lg lg:text-2xl leading-tight font-[family-name:var(--font-eb-garamond)]">
            Reflect on 2025 and record a memorable moment or write a wish for
            the coming year!
          </p>
        </div>

        {/* Letter Writing Section */}
        <div
          className={`w-full h-full bg-white dark:bg-zinc-900 shadow-2xl p-8 transition-all duration-1000 ${isAnimating
            ? "opacity-0 scale-50 translate-y-96"
            : "opacity-100 scale-100 translate-y-0"
            }`}
        >
          <textarea
            value={letter}
            onChange={handleTextareaChange}
            placeholder="Write about your most memorable moment this year—a time with loved ones, a small accomplishment, or a moment of gratitude. You can also share a wish you hope to come true in 2026."
            className="w-full min-h-[35vh] p-4 text-lg focus:outline-none resize-none overflow-hidden"
          />

          {/* Image Upload Section */}
          {!imagePreview && (
            <div className="mt-6">
              <label className="block text-center text-[#b8baa8] mb-3 text-lg font-semibold">
                Send with a Photo!
              </label>
              <label className="block text-center w-full text-center cursor-pointer">
                <div className="w-full border-2 border-[#b8baa8] border-dotted text-[#b8baa8] py-[10vh] leading-none font-semibold transition-all">
                  Find a Photo
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Image Preview */}
          {imagePreview && (
            <div className="mt-6 relative">
              <Image
                src={imagePreview}
                alt="Uploaded memory"
                width={600}
                height={400}
                className="w-full h-auto max-h-96 object-cover border-zinc-200 saturate-60 opacity-90 dark:border-zinc-700"
              />
              <button
                onClick={() => setImagePreview(null)}
                className="absolute top-2 right-2 bg-[#CFD1C3] text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-[#b8baa8] transition-all"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!letter.trim() || isAnimating}
          style={{ fontFamily: fontLoaded ? "Trattatello, serif" : "serif" }}
          className="mt-8 p-8 bg-[#424242] text-white text-3xl rounded-[100%] hover:bg-[#b8baa8] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          Send Your Letter!
        </button>

        {/* Christmas Present Animation */}
        <div
          className={`fixed bottom-0 left-0 text-center w-full text-[40vw] transition-all duration-1000 ${isAnimating ? "translate-y-0 scale-110" : "translate-y-full"
            }`}
        >
          🎁
        </div>

        <Footer />
      </main>
    </div>
  );
}
