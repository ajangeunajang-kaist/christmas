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
      const ornamentId = `ornament_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      formData.append("ornamentId", ornamentId);
      formData.append("story", letter); 

      if (imagePreview) {
        const response = await fetch(imagePreview);
        const blob = await response.blob();
        formData.append("image", blob, "memory.jpg");
      }

      // 외부 서버에 ID 전송 (응답 콘솔 출력)
      try {
        const extRes = await fetch("http://mac-beatles1.kaist.ac.kr:50003/start-job", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: ornamentId }),
        });
        const extData = await extRes.json();
        console.log("External server response:", extData);
      } catch (err) {
        console.log("External server error:", err);
      }

      const result = await fetch("/api/letters", {
        method: "POST",
        body: formData,
      });

      const data = await result.json();
      
      // 에러 확인 추가
      console.log("Response:", data);

      if (data.success) {
        setTimeout(() => {
          alert("Your story is becoming a Christmas Ornament 🎄");
          setIsAnimating(false);
          setLetter("");
          setImagePreview(null);
          router.push("/complete"); // 완료 페이지로 이동
        }, 1000);
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
          className={`w-full h-full bg-white dark:bg-zinc-900 shadow-2xl p-8 transition-all duration-1000 ${
            isAnimating
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

        {/* Christmas Stocking Animation */}
        <div
          className={`fixed bottom-0 left-0 text-center w-full text-[40vw] transition-all duration-1000 ${
            isAnimating ? "translate-y-0 scale-110" : "translate-y-full"
          }`}
        >
          🎁
        </div>

        <Footer />
      </main>
    </div>
  );
}
